import { Outlet } from "react-router-dom";
import { PublicNav } from "./PublicNav";

export function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-white">
      <PublicNav />
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
