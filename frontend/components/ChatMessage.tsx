export default function ChatMessage({
  sender,
  text,
  isStreaming,
}: {
  sender: 'user' | 'bot';
  text: string;
  isStreaming?: boolean;
}) {
  const isUser = sender === 'user';
  return (
    <div className={`p-2 rounded whitespace-pre-wrap ${isUser ? 'bg-blue-100 self-end' : 'bg-gray-100 self-start'}`}>
      <p className="text-sm">{text}{isStreaming ? '▌' : ''}</p>
    </div>
  );
}