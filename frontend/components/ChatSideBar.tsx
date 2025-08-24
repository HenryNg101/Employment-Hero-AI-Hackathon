import FileUploadPanel from "./FileUploadPanel";

export default function ChatSideBar({
  sessions,
  currentId,
  onSelect,
  sidebarMode,
  setSidebarMode,
}: {
  sessions: { id: string; title: string }[];
  currentId: string;
  onSelect: (id: string) => void;
  sidebarMode: "chat" | "files";
  setSidebarMode: (mode: "chat" | "files") => void;
}) {
  return (
    <aside className="w-64 bg-gray-100 p-4 border-r overflow-y-auto flex flex-col">
      <div className="flex justify-between mb-4">
        <button
          onClick={() => setSidebarMode("chat")}
          className={`flex-1 p-2 border rounded-l ${sidebarMode === "chat" ? "bg-white font-semibold" : "bg-gray-200"}`}
        >
          Chat
        </button>
        <button
          onClick={() => setSidebarMode("files")}
          className={`flex-1 p-2 border rounded-r ${sidebarMode === "files" ? "bg-white font-semibold" : "bg-gray-200"}`}
        >
          Upload Files
        </button>
      </div>

      {sidebarMode === "chat" ? (
        <>
          <h2 className="text-lg font-semibold mb-2">Chat History</h2>
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li key={s.id}>
                <button
                  className={`w-full text-left p-2 rounded hover:bg-gray-200 ${
                    s.id === currentId ? "bg-gray-300 font-semibold" : ""
                  }`}
                  onClick={() => onSelect(s.id)}
                >
                  {s.title}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <FileUploadPanel />
      )}
    </aside>
  );
}