import ChatBox from "../components/Chat/ChatBox";

const ChatPage = () => {
  return (
    <div className="h-screen flex flex-col p-4">
      <h1 className="text-2xl font-bold mb-4">Team Chat</h1>

      {/* Chat container takes remaining height */}
      <div className="flex-1 min-h-0">
        <ChatBox />
      </div>
    </div>
  );
};

export default ChatPage;

