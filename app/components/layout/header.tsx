import * as React from "react";
import { authClient } from "~/auth/client";

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { data: session } = authClient.useSession();
  const userName = session?.user?.name ?? session?.user?.email ?? null;

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-6">
      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      {userName && (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium select-none">
            {userName.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm text-muted-foreground">{userName}</span>
        </div>
      )}
    </header>
  );
}
