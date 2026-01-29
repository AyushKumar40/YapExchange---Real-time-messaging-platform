const express = require('express');
const Room = require('../models/Room');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Create a new room
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, isPrivate, isDirectMessage, participants } = req.body;

    if (isDirectMessage && participants) {
      // Check if direct message room already exists
      const existingDM = await Room.findOne({
        isDirectMessage: true,
        participants: { $all: participants },
        'members.user': { $all: participants }
      });

      if (existingDM) {
        return res.json({ room: existingDM });
      }
    }

    // Build members list
    let members = [{
      user: req.user._id,
      role: 'admin'
    }];

    if (isDirectMessage && Array.isArray(participants) && participants.length > 0) {
      const uniqueIds = new Set(
        participants.map(id => id.toString()).concat(req.user._id.toString())
      );
      members = Array.from(uniqueIds).map(id => ({
        user: id,
        role: id === req.user._id.toString() ? 'admin' : 'member'
      }));
    }

    const room = new Room({
      name,
      description,
      isPrivate,
      isDirectMessage,
      creator: req.user._id,
      participants: isDirectMessage ? participants : [],
      members
    });

    await room.save();
    await room.populate('members.user', 'username avatar');
    await room.populate('participants', 'username avatar');

    res.status(201).json({ room });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all public rooms
router.get('/public', auth, async (req, res) => {
  try {
    const rooms = await Room.find({
      isPrivate: false,
      isActive: true
    })
    .populate('creator', 'username avatar')
    .populate('members.user', 'username avatar')
    .sort({ createdAt: -1 });

    res.json({ rooms });
  } catch (error) {
    console.error('Get public rooms error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's rooms (both created and joined)
router.get('/my-rooms', auth, async (req, res) => {
  try {
    const rooms = await Room.find({
      $or: [
        { creator: req.user._id },
        { 'members.user': req.user._id }
      ],
      isActive: true
    })
    .populate('creator', 'username avatar')
    .populate('members.user', 'username avatar')
    .populate('participants', 'username avatar')
    .sort({ updatedAt: -1 });

    res.json({ rooms });
  } catch (error) {
    console.error('Get my rooms error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get room by ID
router.get('/:roomId', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId)
      .populate('creator', 'username avatar')
      .populate('members.user', 'username avatar')
      .populate('participants', 'username avatar');

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if user is a member
    const isMember = room.members.some(member => 
      member.user && member.user._id && member.user._id.toString() === req.user._id.toString()
    );

    if (room.isPrivate && !isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ room });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Join a room
router.post('/:roomId/join', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (room.isPrivate) {
      return res.status(403).json({ message: 'Cannot join private room' });
    }

    // Check if user is already a member
    const isAlreadyMember = room.members.some(member => 
      member.user && member.user.toString() === req.user._id.toString()
    );

    if (isAlreadyMember) {
      return res.status(400).json({ message: 'Already a member of this room' });
    }

    // Check if room is full
    if (room.members.length >= room.maxMembers) {
      return res.status(400).json({ message: 'Room is full' });
    }

    room.members.push({
      user: req.user._id,
      role: 'member'
    });

    await room.save();
    await room.populate('members.user', 'username avatar');

    res.json({ room });
  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Leave a room
router.post('/:roomId/leave', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Remove user from members
    room.members = room.members.filter(member => 
      member.user.toString() !== req.user._id.toString()
    );

    // If no members left and it's not a direct message, deactivate room
    if (room.members.length === 0 && !room.isDirectMessage) {
      room.isActive = false;
    }

    await room.save();

    res.json({ message: 'Left room successfully' });
  } catch (error) {
    console.error('Leave room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update room (admin only)
router.put('/:roomId', auth, async (req, res) => {
  try {
    const { name, description, maxMembers } = req.body;
    
    const room = await Room.findById(req.params.roomId);
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if user is admin
    const isAdmin = room.members.some(member => 
      member.user.toString() === req.user._id.toString() && 
      member.role === 'admin'
    );

    if (!isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const updates = {};
    if (name) updates.name = name;
    if (description) updates.description = description;
    if (maxMembers) updates.maxMembers = maxMembers;

    const updatedRoom = await Room.findByIdAndUpdate(
      req.params.roomId,
      updates,
      { new: true, runValidators: true }
    )
    .populate('creator', 'username avatar')
    .populate('members.user', 'username avatar');

    res.json({ room: updatedRoom });
  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete room (creator only)
router.delete('/:roomId', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if user is the creator
    if (room.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only room creator can delete the room' });
    }

    await Room.findByIdAndDelete(req.params.roomId);

    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
