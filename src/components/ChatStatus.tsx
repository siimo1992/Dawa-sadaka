import React from 'react';
import './chat-status.css';

export type ChatStatusProps = {
  status: "preparing" | "searching" | "writing";
};

const statusText = {
  preparing: "أحضّر الإجابة المناسبة",
  searching: "أبحث في المصادر",
  writing: "أكتب الإجابة",
};

export function ChatStatus({ status }: ChatStatusProps) {
  return (
    <div className="chat-status" role="status" aria-live="polite">
      <span className="chat-status__icon" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>

      <span className="chat-status__text">{statusText[status]}</span>
    </div>
  );
}

export default ChatStatus;
