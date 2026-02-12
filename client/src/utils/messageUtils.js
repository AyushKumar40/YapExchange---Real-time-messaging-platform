import React from "react";
import Mention from "../components/chat/Mention";
import { parseFormattedText } from "./textFormatting";

// Parse message content and replace @mentions with Mention components
export const parseMessageContent = (content, mentions = [], currentUserId) => {
  if (!content) return content;

  const mentionRegex = /@(\w+)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    // Add text before mention
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index);
      parts.push(parseFormattedText(textBefore));
    }

    // Store username in a local variable to avoid closure issue
    const mentionedUsername = match[1];
    const mentionedUser = mentions.find(
      (user) => user.username === mentionedUsername
    );
    const isOwnMention = mentionedUser && mentionedUser._id === currentUserId;

    // Add mention component
    parts.push(
      <Mention
        key={match.index}
        username={mentionedUsername}
        isOwnMention={isOwnMention}
      />
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    const remainingText = content.slice(lastIndex);
    parts.push(parseFormattedText(remainingText));
  }

  return parts.length > 0 ? parts : parseFormattedText(content);
};

// Check if message contains mentions for current user
export const hasUserMention = (message, currentUserId) => {
  if (!message.mentions || !Array.isArray(message.mentions)) return false;
  return message.mentions.some((mention) => mention._id === currentUserId);
};

// Extract usernames from content for autocomplete
export const extractUsernames = (content) => {
  const mentionRegex = /@(\w+)/g;
  const usernames = [];
  let match;

  // Reset regex lastIndex to avoid issues with global regex
  mentionRegex.lastIndex = 0;

  while ((match = mentionRegex.exec(content)) !== null) {
    usernames.push(match[1]);
  }

  return usernames;
};
