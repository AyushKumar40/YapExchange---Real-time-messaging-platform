import React, { useCallback, useEffect, useRef, useState } from "react";
import useChatStore from "../../store/chatStore";
import useAuthStore from "../../store/authStore";

const CallComponent = () => {
  const { socket, outgoingCallTarget, setOutgoingCallTarget } = useChatStore();
  const { user } = useAuthStore();

  const [callState, setCallState] = useState("idle");

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(new MediaStream());
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const localVideoRef = useRef(null);
  const queuedIceCandidatesRef = useRef([]);
  const isCallingRef = useRef(false);

  const otherUserId = outgoingCallTarget?.receiverId;
  const isVideo = outgoingCallTarget?.isVideoCall;

  const cleanupCall = useCallback(() => {
    const pc = pcRef.current;
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.oniceconnectionstatechange = null;
      pc.close();
      pcRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current = new MediaStream();
    }

    queuedIceCandidatesRef.current = [];
    isCallingRef.current = false;
    setCallState("idle");
  }, []);

  const flushQueuedIceCandidates = async () => {
    const pc = pcRef.current;
    if (!pc) return;

    while (queuedIceCandidatesRef.current.length > 0) {
      const candidate = queuedIceCandidatesRef.current.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn("Queued ICE candidate failed:", err);
      }
    }
  };

  const attachRemoteStream = (stream) => {
    if (!stream) return;

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
      remoteVideoRef.current.volume = 1;
      remoteVideoRef.current.muted = false;
      remoteVideoRef.current.play().catch(() => {});
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = stream;
      remoteAudioRef.current.volume = 1;
      remoteAudioRef.current.muted = false;
      remoteAudioRef.current.play().catch(() => {});
    }
  };

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.ontrack = (event) => {
      const incomingStream =
        event.streams && event.streams.length > 0
          ? event.streams[0]
          : remoteStreamRef.current;

      if (!incomingStream.getTracks().length || !event.streams.length) {
        incomingStream.addTrack(event.track);
      }

      remoteStreamRef.current = incomingStream;
      attachRemoteStream(incomingStream);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit("ice-candidate", {
          to: otherUserId,
          candidate: event.candidate,
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      if (state === "disconnected" || state === "failed") {
        cleanupCall();
        setOutgoingCallTarget(null);
      }
    };

    return pc;
  };

  const addIceCandidate = useCallback(async (candidate) => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription || !pc.remoteDescription.type) {
      queuedIceCandidatesRef.current.push(candidate);
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn("Failed to add ICE candidate:", err);
    }
  }, []);

  // =========================
  // 🎯 START CALL (SAFE)
  // =========================
  const startCall = async () => {
    if (isCallingRef.current) return;
    isCallingRef.current = true;

    console.log("Starting call...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideo,
        audio: true,
      });

      localStreamRef.current = stream;
      if (localVideoRef.current && isVideo) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = createPeerConnection();
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("call-user", {
        userToCall: otherUserId,
        signalData: offer,
        from: user._id,
        isVideoCall: isVideo,
      });

      setCallState("calling");
    } catch (err) {
      console.error("CALL ERROR:", err);
    }
  };

  // =========================
  // 📞 ANSWER CALL
  // =========================
  const answerCall = async () => {
    const signal = outgoingCallTarget?.signal;
    if (!signal) return;

    console.log("Answering call...");

    const stream = await navigator.mediaDevices.getUserMedia({
      video: isVideo,
      audio: true,
    });

    localStreamRef.current = stream;
    if (localVideoRef.current && isVideo) {
      localVideoRef.current.srcObject = stream;
    }

    const pc = createPeerConnection();
    pcRef.current = pc;

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    await pc.setRemoteDescription(new RTCSessionDescription(signal));
    await flushQueuedIceCandidates();

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.emit("answer-call", {
      to: otherUserId,
      signal: answer,
    });

    setCallState("connected");
  };

  // =========================
  // 📡 SOCKET EVENTS (SAFE)
  // =========================
  useEffect(() => {
    if (!socket) return;

    const onAccepted = async (signal) => {
      const pc = pcRef.current;
      if (!pc) return;

      // ✅ FIX: prevent duplicate calls
      if (pc.signalingState !== "have-local-offer") {
        console.warn(
          "Skipping setRemoteDescription, state:",
          pc.signalingState
        );
        return;
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
        setCallState("connected");
      } catch (err) {
        console.error("SDP error:", err);
      }
    };

    const onIce = async (candidate) => {
      await addIceCandidate(candidate);
    };

    const onCallEnded = () => {
      cleanupCall();
      setOutgoingCallTarget(null);
    };

    const onCallRejected = () => {
      cleanupCall();
      setOutgoingCallTarget(null);
    };

    socket.on("call-accepted", onAccepted);
    socket.on("ice-candidate", onIce);
    socket.on("call-ended", onCallEnded);
    socket.on("call-rejected", onCallRejected);

    return () => {
      socket.off("call-accepted", onAccepted);
      socket.off("ice-candidate", onIce);
      socket.off("call-ended", onCallEnded);
      socket.off("call-rejected", onCallRejected);
    };
  }, [socket, cleanupCall, addIceCandidate, setOutgoingCallTarget]);

  useEffect(() => {
    if (localStreamRef.current && localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [callState]);

  useEffect(() => {
    if (callState === "connected" && remoteStreamRef.current) {
      attachRemoteStream(remoteStreamRef.current);
    }
  }, [callState]);

  // =========================
  // 🔚 END CALL
  // =========================
  const endCall = () => {
    console.log("Ending call");
    cleanupCall();

    if (socket && otherUserId) {
      socket.emit("end-call", { to: otherUserId });
    }

    setOutgoingCallTarget(null);
  };

  // =========================
  // 🧠 RENDER
  // =========================

  if (!outgoingCallTarget) return null;

  const callerName = outgoingCallTarget.receiverName || "Unknown";

  return (
    <div className="call-overlay">
      <div
        className={`call-modal ${callState === "connected" ? "call-modal--ongoing" : ""} ${isVideo ? "" : "call-modal--voice"} ${outgoingCallTarget.incoming ? "call-modal--incoming" : ""}`}
      >
        {/* Header */}
        <div className="call-ongoing-header">
          <div>
            <h2 className="call-title">
              {outgoingCallTarget.incoming
                ? "Incoming Call"
                : callState === "calling"
                  ? "Calling"
                  : callState === "connected"
                    ? "In Call"
                    : "Start Call"}
            </h2>
            <p className="call-ongoing-name">{callerName}</p>
          </div>
        </div>

        {/* Idle State - Incoming */}
        {callState === "idle" && outgoingCallTarget.incoming && (
          <div className="call-state-content">
            {isVideo && (
              <div className="call-avatar-large">
                <span>{callerName.slice(0, 2).toUpperCase()}</span>
              </div>
            )}
            <div className="call-actions">
              <button
                className="call-btn call-btn--accept"
                onClick={answerCall}
              >
                <span className="call-btn-icon">✓</span>
                Accept
              </button>
              <button className="call-btn call-btn--reject" onClick={endCall}>
                <span className="call-btn-icon">✕</span>
                Reject
              </button>
            </div>
          </div>
        )}

        {/* Idle State - Outgoing */}
        {callState === "idle" && !outgoingCallTarget.incoming && (
          <div className="call-state-content">
            {isVideo && (
              <div className="call-avatar-large">
                <span>{callerName.slice(0, 2).toUpperCase()}</span>
              </div>
            )}
            <div className="call-actions">
              <button
                className="call-btn call-btn--primary"
                onClick={startCall}
              >
                <span className="call-btn-icon">📞</span>
                Start {isVideo ? "Video" : "Voice"} Call
              </button>
            </div>
          </div>
        )}

        {/* Calling State */}
        {callState === "calling" && (
          <div className="call-state-content">
            <div className="call-avatar-large">
              <span>{callerName.slice(0, 2).toUpperCase()}</span>
            </div>
            <div className="call-spinner" />
            <p className="call-status-text">Calling {callerName}...</p>
            <div className="call-actions">
              <button className="call-btn call-btn--cancel" onClick={endCall}>
                <span className="call-btn-icon">✕</span>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Connected State */}
        {callState === "connected" && (
          <div className="call-connected-container">
            <>
              <div className="call-videos-wrapper">
                <video
                  ref={remoteVideoRef}
                  className="call-video call-video--remote"
                  autoPlay
                  playsInline
                />
                {isVideo && (
                  <div className="call-video--local-wrapper">
                    <video
                      ref={localVideoRef}
                      className="call-video call-video--local"
                      autoPlay
                      playsInline
                      muted
                    />
                    <span className="video-label">You</span>
                  </div>
                )}
              </div>
              <audio ref={remoteAudioRef} autoPlay hidden={isVideo} />
              {!isVideo && (
                <div className="call-audio-container">
                  <div className="call-avatar-large">
                    <span>{callerName.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <p className="call-status-text">🎙️ Voice Call Active</p>
                </div>
              )}
            </>

            <div className="call-actions call-actions--connected">
              <button className="call-btn call-btn--end" onClick={endCall}>
                <span className="call-btn-icon">📞</span>
                End Call
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallComponent;
