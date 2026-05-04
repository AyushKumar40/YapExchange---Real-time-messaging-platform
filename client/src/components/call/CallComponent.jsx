import React, { useEffect, useRef, useState, useCallback } from "react";
import useChatStore from "../../store/chatStore";
import useAuthStore from "../../store/authStore";
import "./CallComponent.css";

const CALL_STATES = {
  IDLE: "idle",
  CALLING: "calling",
  RINGING: "ringing",
  CONNECTED: "connected",
  ENDED: "ended",
  REJECTED: "rejected",
  FAILED: "failed",
};

const ACTIVE_CALL_STATES = [
  CALL_STATES.CALLING,
  CALL_STATES.RINGING,
  CALL_STATES.CONNECTED,
];

const attachStreamToVideo = (videoEl, stream) => {
  if (!videoEl || !stream) return;

  try {
    if (videoEl.srcObject !== stream) {
      videoEl.srcObject = stream;
    }

    const playPromise = videoEl.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise.catch(() => {});
    }
  } catch (e) {
    // ignore
  }
};

const CallComponent = ({
  receiverId: receiverIdProp,
  receiverName: receiverNameProp = "User",
  isVideoCall: isVideoCallProp = true,
  onClose: onCloseProp,
}) => {
  const { socket, outgoingCallTarget, setOutgoingCallTarget } = useChatStore();
  const { user } = useAuthStore();
  const currentUserId = user?._id;

  const receiverId = receiverIdProp ?? outgoingCallTarget?.receiverId;
  const receiverName =
    receiverNameProp ?? outgoingCallTarget?.receiverName ?? "User";
  const isVideoCall =
    isVideoCallProp ?? outgoingCallTarget?.isVideoCall ?? true;
  const onClose = useCallback(() => {
    setOutgoingCallTarget?.(null);
    onCloseProp?.();
  }, [setOutgoingCallTarget, onCloseProp]);

  const [callState, setCallState] = useState(CALL_STATES.IDLE);
  const [incomingCall, setIncomingCall] = useState(null);
  const [remoteDisplayName, setRemoteDisplayName] = useState("");
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isLocalVideoOff, setIsLocalVideoOff] = useState(false);
  const [isRemoteVideoOff, setIsRemoteVideoOff] = useState(false);
  const [isCameraSwitching, setIsCameraSwitching] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showEndedModal, setShowEndedModal] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localVideoSenderRef = useRef(null);
  const otherPeerUserIdRef = useRef(null);
  const localStreamRef = useRef(null);
  const inCallRef = useRef(false);
  const hasBeenInCallRef = useRef(false);
  const isUnmountedRef = useRef(false);
  const isVideoCallRef = useRef(true);
  const pendingIceCandidatesRef = useRef([]);
  const preConnectionIceQueueRef = useRef([]);

  localStreamRef.current = localStream;

  useEffect(() => {
    const active = ACTIVE_CALL_STATES.includes(callState);
    inCallRef.current = active;
    if (active) hasBeenInCallRef.current = true;
  }, [callState]);

  const stopAllTracks = useCallback((stream) => {
    if (!stream) return;
    try {
      stream.getTracks().forEach((track) => track.stop());
    } catch (e) {
      // ignore
    }
  }, []);

  const closePeerConnection = useCallback(() => {
    const pc = pcRef.current;
    pcRef.current = null;
    localVideoSenderRef.current = null;
    pendingIceCandidatesRef.current = [];
    preConnectionIceQueueRef.current = [];
    if (!pc) return;
    try {
      pc.close();
    } catch (e) {
      // ignore
    }
  }, []);

  const resetCall = useCallback(() => {
    closePeerConnection();
    const stream = localStreamRef.current;
    if (stream) {
      stopAllTracks(stream);
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setIncomingCall(null);
    setRemoteDisplayName("");
    otherPeerUserIdRef.current = null;
    setIsMuted(false);
    setIsLocalVideoOff(false);
    setIsRemoteVideoOff(false);
    setIsCameraSwitching(false);
    setErrorMessage(null);
  }, [closePeerConnection, stopAllTracks]);

  const endCall = useCallback(() => {
    const otherId = otherPeerUserIdRef.current;
    if (socket && otherId) {
      try {
        socket.emit("end-call", { to: otherId });
      } catch (e) {
        // ignore if socket closed
      }
    }
    otherPeerUserIdRef.current = null;
    inCallRef.current = false;
    setCallState(CALL_STATES.ENDED);
    setShowEndedModal(true);
    resetCall();
  }, [socket, resetCall]);

  useEffect(() => {
    attachStreamToVideo(localVideoRef.current, localStream);
  }, [callState, isLocalVideoOff, localStream]);

  useEffect(() => {
    attachStreamToVideo(remoteVideoRef.current, remoteStream);
  }, [callState, remoteStream]);

  const setLocalVideoNode = useCallback((node) => {
    localVideoRef.current = node;
    attachStreamToVideo(node, localStreamRef.current);
  }, []);

  const setRemoteVideoNode = useCallback(
    (node) => {
      remoteVideoRef.current = node;
      attachStreamToVideo(node, remoteStream);
    },
    [remoteStream],
  );

  useEffect(() => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((t) => {
      t.enabled = !isMuted;
    });
  }, [isMuted, localStream]);

  const removeLocalVideoTrack = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return null;

    stream.getVideoTracks().forEach((track) => {
      stream.removeTrack(track);
      track.stop();
    });

    const nextStream = new MediaStream(stream.getAudioTracks());
    localStreamRef.current = nextStream;
    setLocalStream(nextStream);
    return nextStream;
  }, []);

  const setLocalCameraOff = useCallback(
    async (videoOff) => {
      if (!isVideoCallRef.current) return;

      if (videoOff) {
        await localVideoSenderRef.current?.replaceTrack(null);
        removeLocalVideoTrack();
        return;
      }

      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      const [videoTrack] = videoStream.getVideoTracks();
      if (!videoTrack) return;

      const currentStream = localStreamRef.current || new MediaStream();
      currentStream.getVideoTracks().forEach((track) => {
        currentStream.removeTrack(track);
        track.stop();
      });
      currentStream.addTrack(videoTrack);

      if (localVideoSenderRef.current) {
        await localVideoSenderRef.current.replaceTrack(videoTrack);
      } else if (pcRef.current) {
        localVideoSenderRef.current = pcRef.current.addTrack(
          videoTrack,
          currentStream,
        );
      }

      const nextStream = new MediaStream(currentStream.getTracks());
      localStreamRef.current = nextStream;
      setLocalStream(nextStream);
    },
    [removeLocalVideoTrack],
  );

  const toggleLocalCamera = useCallback(async () => {
    if (isCameraSwitching) return;

    const next = !isLocalVideoOff;
    setIsCameraSwitching(true);
    try {
      await setLocalCameraOff(next);
      setIsLocalVideoOff(next);
    } catch (err) {
      console.error("camera toggle error:", err);
      setErrorMessage(
        err.message || "Could not change camera state. Please try again.",
      );
    } finally {
      setIsCameraSwitching(false);
    }
  }, [isCameraSwitching, isLocalVideoOff, setLocalCameraOff]);

  const trackLocalSender = useCallback((pc, stream) => {
    stream.getTracks().forEach((track) => {
      const sender = pc.addTrack(track, stream);
      if (track.kind === "video") {
        localVideoSenderRef.current = sender;
      }
    });
  }, []);

  const handleRemoteTrack = useCallback((ev) => {
    if (ev.track?.kind === "video") {
      const updateRemoteVideoState = () => {
        setIsRemoteVideoOff(
          ev.track.muted || ev.track.readyState === "ended",
        );
      };

      ev.track.onmute = () => setIsRemoteVideoOff(true);
      ev.track.onunmute = () => setIsRemoteVideoOff(false);
      ev.track.onended = () => setIsRemoteVideoOff(true);
      updateRemoteVideoState();
    }

    setRemoteStream((prev) => {
      const next = new MediaStream();
      if (prev) prev.getTracks().forEach((t) => next.addTrack(t));
      if (ev.streams?.[0]) {
        ev.streams[0].getTracks().forEach((t) => {
          if (!next.getTracks().some((x) => x.id === t.id)) next.addTrack(t);
        });
      } else if (
        ev.track &&
        !next.getTracks().some((t) => t.id === ev.track.id)
      ) {
        next.addTrack(ev.track);
      }
      return next;
    });
  }, []);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = ({
      from,
      fromUsername,
      signal,
      isVideoCall: incomingIsVideo,
    }) => {
      setIncomingCall({
        from,
        fromUsername,
        signal,
        isVideoCall: !!incomingIsVideo,
      });
      setCallState(CALL_STATES.RINGING);
      otherPeerUserIdRef.current = from;
      pendingIceCandidatesRef.current = [];
      preConnectionIceQueueRef.current = [];
      setIsRemoteVideoOff(false);
    };

    const handleCallAccepted = async (signal) => {
      const pc = pcRef.current;
      if (!pc || !signal) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
        const pending = pendingIceCandidatesRef.current;
        pendingIceCandidatesRef.current = [];
        for (const c of pending) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(c));
          } catch (e) {
            // ignore
          }
        }
        setCallState(CALL_STATES.CONNECTED);
      } catch (e) {
        console.error("setRemoteDescription error:", e);
        if (!isUnmountedRef.current) {
          setErrorMessage("Connection error");
          setCallState(CALL_STATES.FAILED);
          setShowEndedModal(true);
          resetCall();
        }
      }
    };

    const handleIceCandidate = async (candidate) => {
      if (!candidate) return;
      const pc = pcRef.current;
      if (!pc) {
        preConnectionIceQueueRef.current.push(candidate);
        return;
      }
      try {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          pendingIceCandidatesRef.current.push(candidate);
        }
      } catch (e) {
        // ignore
      }
    };

    const handleCallEnded = () => {
      if (!inCallRef.current) return;
      inCallRef.current = false;
      setCallState(CALL_STATES.ENDED);
      setShowEndedModal(true);
      resetCall();
    };

    const handleCallRejected = () => {
      if (!inCallRef.current) return;
      inCallRef.current = false;
      setCallState(CALL_STATES.REJECTED);
      setShowEndedModal(true);
      resetCall();
    };

    const handleCallFailed = (payload) => {
      if (!inCallRef.current) return;
      inCallRef.current = false;
      const message = payload?.message || "Call failed";
      setErrorMessage(message);
      setCallState(CALL_STATES.FAILED);
      setShowEndedModal(true);
      resetCall();
    };

    socket.on("incoming-call", handleIncomingCall);
    socket.on("call-accepted", handleCallAccepted);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("call-ended", handleCallEnded);
    socket.on("call-rejected", handleCallRejected);
    socket.on("call-failed", handleCallFailed);

    return () => {
      socket.off("incoming-call", handleIncomingCall);
      socket.off("call-accepted", handleCallAccepted);
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("call-ended", handleCallEnded);
      socket.off("call-rejected", handleCallRejected);
      socket.off("call-failed", handleCallFailed);
    };
  }, [socket, resetCall]);

  useEffect(() => {
    isUnmountedRef.current = false;
    return () => {
      isUnmountedRef.current = true;
      if (!inCallRef.current) return;
      const otherId = otherPeerUserIdRef.current;
      if (socket && otherId) {
        try {
          socket.emit("end-call", { to: otherId });
        } catch (e) {
          // ignore
        }
      }
      closePeerConnection();
      const stream = localStreamRef.current;
      if (stream) stopAllTracks(stream);
      localStreamRef.current = null;
    };
  }, [socket, closePeerConnection, stopAllTracks]);

  const startCall = async () => {
    if (!socket || !receiverId || !currentUserId) {
      setErrorMessage("Cannot start call: missing user or connection");
      setCallState(CALL_STATES.FAILED);
      setShowEndedModal(true);
      hasBeenInCallRef.current = true;
      return;
    }
    setErrorMessage(null);
    otherPeerUserIdRef.current = receiverId;
    setRemoteDisplayName(receiverName || "User");
    isVideoCallRef.current = !!isVideoCall;
    setCallState(CALL_STATES.CALLING);
    setIsMuted(false);
    setIsLocalVideoOff(!isVideoCallRef.current);
    setIsRemoteVideoOff(false);
    inCallRef.current = true;
    hasBeenInCallRef.current = true;
    pendingIceCandidatesRef.current = [];
    preConnectionIceQueueRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoCallRef.current,
        audio: true,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pcRef.current = pc;

      trackLocalSender(pc, stream);
      pc.ontrack = handleRemoteTrack;

      pc.onicecandidate = (ev) => {
        if (!ev.candidate || !socket) return;
        socket.emit("ice-candidate", {
          to: receiverId,
          candidate: ev.candidate,
        });
      };

      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "disconnected"
        ) {
          if (!isUnmountedRef.current && inCallRef.current) {
            setErrorMessage("Connection failed");
            setCallState(CALL_STATES.FAILED);
            setShowEndedModal(true);
            resetCall();
          }
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("call-user", {
        userToCall: receiverId,
        signalData: { type: offer.type, sdp: offer.sdp },
        from: currentUserId,
        isVideoCall: isVideoCallRef.current,
      });
    } catch (err) {
      console.error("getUserMedia/createOffer error:", err);
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        setErrorMessage("Camera/microphone access was denied.");
      } else {
        setErrorMessage(
          err.message || "Could not access camera or microphone.",
        );
      }
      setCallState(CALL_STATES.FAILED);
      setShowEndedModal(true);
      hasBeenInCallRef.current = true;
      resetCall();
    }
  };

  const answerCall = async () => {
    if (!socket || !incomingCall) return;
    const {
      from,
      fromUsername,
      signal,
      isVideoCall: incomingIsVideo,
    } = incomingCall;
    otherPeerUserIdRef.current = from;
    setRemoteDisplayName(fromUsername || "User");
    setErrorMessage(null);
    isVideoCallRef.current = !!incomingIsVideo;
    pendingIceCandidatesRef.current = [];
    setIsMuted(false);
    setIsLocalVideoOff(!isVideoCallRef.current);
    setIsRemoteVideoOff(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoCallRef.current,
        audio: true,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pcRef.current = pc;

      pc.ontrack = handleRemoteTrack;

      pc.onicecandidate = (ev) => {
        if (!ev.candidate || !socket) return;
        socket.emit("ice-candidate", { to: from, candidate: ev.candidate });
      };

      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "disconnected"
        ) {
          if (!isUnmountedRef.current && inCallRef.current) {
            setErrorMessage("Connection failed");
            setCallState(CALL_STATES.FAILED);
            setShowEndedModal(true);
            resetCall();
          }
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(signal));
      trackLocalSender(pc, stream);

      const preQueue = preConnectionIceQueueRef.current;
      preConnectionIceQueueRef.current = [];
      const pending = pendingIceCandidatesRef.current;
      pendingIceCandidatesRef.current = [];
      for (const c of [...preQueue, ...pending]) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(c));
        } catch (e) {
          // ignore
        }
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("answer-call", {
        to: from,
        signal: { type: answer.type, sdp: answer.sdp },
      });

      setCallState(CALL_STATES.CONNECTED);
      setIncomingCall(null);
    } catch (err) {
      console.error("getUserMedia/createAnswer error:", err);
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        setErrorMessage("Camera/microphone access was denied.");
      } else {
        setErrorMessage(
          err.message || "Could not access camera or microphone.",
        );
      }
      setCallState(CALL_STATES.FAILED);
      setShowEndedModal(true);
      rejectCall();
    }
  };

  const rejectCall = () => {
    const from = incomingCall?.from;
    if (socket && from) {
      try {
        socket.emit("reject-call", { to: from });
      } catch (e) {
        // ignore
      }
    }
    inCallRef.current = false;
    setCallState(CALL_STATES.REJECTED);
    setShowEndedModal(true);
    setIncomingCall(null);
    resetCall();
  };

  const cancelCall = () => {
    endCall();
  };

  const handleCloseEnded = () => {
    setCallState(CALL_STATES.IDLE);
    setShowEndedModal(false);
    setErrorMessage(null);
    hasBeenInCallRef.current = false;
    onClose();
  };

  if (!socket) {
    if (receiverId) {
      return (
        <div className="call-overlay">
          <div className="call-modal call-modal--error">
            <p>Not connected. Please wait and try again.</p>
            <button
              type="button"
              className="call-btn call-btn--primary"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      );
    }
    return null;
  }

  if (callState === CALL_STATES.IDLE && !receiverId) {
    return null;
  }

  if (
    showEndedModal &&
    hasBeenInCallRef.current &&
    (callState === CALL_STATES.ENDED ||
      callState === CALL_STATES.REJECTED ||
      callState === CALL_STATES.FAILED)
  ) {
    const isError = callState === CALL_STATES.FAILED || errorMessage;
    const message =
      callState === CALL_STATES.REJECTED
        ? "Call declined"
        : callState === CALL_STATES.FAILED
          ? errorMessage || "Call failed"
          : "Call ended";

    return (
      <div className="call-overlay">
        <div className={`call-modal ${isError ? "call-modal--error" : ""}`}>
          <p>{message}</p>
          <button
            type="button"
            className="call-btn call-btn--primary"
            onClick={handleCloseEnded}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (callState === CALL_STATES.IDLE && receiverId) {
    return (
      <div className="call-overlay">
        <div className="call-modal call-modal--outgoing">
          <h2>{isVideoCall ? "Video Call" : "Voice Call"}</h2>
          <p className="call-target-name">{receiverName}</p>
          <div className="call-actions">
            <button
              type="button"
              className="call-btn call-btn--secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="call-btn call-btn--primary"
              onClick={startCall}
            >
              Start {isVideoCall ? "Video" : "Voice"} Call
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (callState === CALL_STATES.CALLING) {
    return (
      <div className="call-overlay">
        <div className="call-modal call-modal--outgoing">
          <div className="call-spinner" />
          <h2>Calling…</h2>
          <p className="call-target-name">{receiverName}</p>
          <button
            type="button"
            className="call-btn call-btn--danger"
            onClick={cancelCall}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (callState === CALL_STATES.RINGING && incomingCall) {
    return (
      <div className="call-overlay">
        <div className="call-modal call-modal--incoming">
          <h2>
            {incomingCall.isVideoCall
              ? "Incoming Video Call"
              : "Incoming Voice Call"}
          </h2>
          <p className="call-target-name">{incomingCall.fromUsername}</p>
          <div className="call-actions">
            <button
              type="button"
              className="call-btn call-btn--danger"
              onClick={rejectCall}
            >
              Decline
            </button>
            <button
              type="button"
              className="call-btn call-btn--primary"
              onClick={answerCall}
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentIsVideoCall = isVideoCallRef.current;

  if (callState === CALL_STATES.CONNECTED) {
    const controls = (
      <div className="call-controls">
        <button
          type="button"
          className={`call-control-btn ${isMuted ? "active" : ""}`}
          onClick={() => setIsMuted((m) => !m)}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? "🔇" : "🎤"}
        </button>
        {currentIsVideoCall && (
          <button
            type="button"
            className={`call-control-btn ${
              isLocalVideoOff ? "active" : ""
            }`}
            onClick={toggleLocalCamera}
            disabled={isCameraSwitching}
            title={
              isLocalVideoOff ? "Turn on my camera" : "Turn off my camera"
            }
          >
            {isLocalVideoOff ? "📷 Off" : "📷"}
          </button>
        )}
        <button
          type="button"
          className="call-control-btn call-control-btn--end"
          onClick={endCall}
          title="End call"
        >
          📞 End
        </button>
      </div>
    );

    if (!currentIsVideoCall) {
      return (
        <div className="call-overlay">
          <div className="call-modal call-modal--ongoing call-modal--voice">
            <div className="call-ongoing-header">
              <span className="call-ongoing-title">In call with</span>
              <span className="call-ongoing-name">
                {remoteDisplayName || "User"}
              </span>
            </div>
            <div className="call-voice-layout">
              <div className="call-voice-avatar">
                {(remoteDisplayName || "U").charAt(0).toUpperCase()}
              </div>
              <p className="call-voice-label">Voice call</p>
            </div>
            {controls}
          </div>
        </div>
      );
    }

    return (
      <div className="call-overlay">
        <div className="call-modal call-modal--ongoing">
          <div className="call-ongoing-header">
            <span className="call-ongoing-title">In call with</span>
            <span className="call-ongoing-name">
              {remoteDisplayName || "Peer"}
            </span>
          </div>
          <div className="call-videos">
            <div className="call-video call-video--remote">
              <span className="call-video-label call-video-label--remote">
                {remoteDisplayName || "Peer"}
              </span>
              {remoteStream ? (
                <>
                  <video
                    key="remote-video"
                    ref={setRemoteVideoNode}
                    autoPlay
                    playsInline
                    className={`call-video-el ${
                      isRemoteVideoOff ? "call-video-el--hidden" : ""
                    }`}
                  />
                  {isRemoteVideoOff && (
                    <div className="call-video-placeholder call-video-placeholder--remote">
                      <span>
                        {remoteDisplayName || "Peer"} camera is off
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="call-video-placeholder">
                  <span>Waiting for {remoteDisplayName || "peer"}…</span>
                </div>
              )}
            </div>
            <div className="call-video call-video--local">
              <span className="call-video-label call-video-label--local">
                You
              </span>
              {localStream && !isLocalVideoOff ? (
                <video
                  key="local-video"
                  ref={setLocalVideoNode}
                  muted
                  autoPlay
                  playsInline
                  className="call-video-el"
                />
              ) : (
                <div className="call-video-placeholder call-video-placeholder--local">
                  {isLocalVideoOff ? "Camera off" : "You"}
                </div>
              )}
            </div>
          </div>
          {controls}
        </div>
      </div>
    );
  }

  return null;
};

export default CallComponent;
