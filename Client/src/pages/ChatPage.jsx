import React from 'react';
// import ChatBox from '../components/Chat/ChatBox';
// import PersonalChatBox from '../components/Chat/PersonalChatBox';

const ChatPage = () => {
  return (
    <div className="chat-background min-h-screen relative">
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-60"></div>

      {/* Chat container */}
      <div className="relative z-10 flex flex-col h-screen">
        {/* <PersonalChatBox /> */}
        {/* <ChatBox /> */}
      </div>
    </div>
  );
};

export default ChatPage;
