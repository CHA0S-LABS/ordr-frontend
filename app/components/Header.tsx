"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { connected, publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();

  const shortAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : null;

  function handleConnect() {
    if (connected) {
      disconnect();
    } else {
      setVisible(true);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-50 shrink-0 border-b border-border bg-surface">
        <div className="h-14 flex items-center justify-between px-3 md:px-5">
          <div className="flex items-center space-x-6">
            <Link href="/" className="flex items-center space-x-3">
              <Image src="/logo.png" alt="ordr logo" width={42} height={42} className="rounded-full object-cover" />
              <span className="font-mono tracking-tighter text-3xl font-bold">ordr</span>
            </Link>
            <nav className="hidden md:flex items-center space-x-5 text-sm">
              <Link href="/" className={`pb-px transition-colors ${pathname === '/' ? 'text-primary font-medium border-b border-primary' : 'text-muted hover:text-primary'}`}>Trade</Link>
              <Link href="/swap" className={`pb-px transition-colors ${pathname === '/swap' ? 'text-primary font-medium border-b border-primary' : 'text-muted hover:text-primary'}`}>Swap</Link>
            </nav>
          </div>
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <button
              onClick={handleConnect}
              className="flex items-center px-3 py-1.5 border border-border text-xs font-mono hover:bg-surface-hover transition-colors cursor-pointer"
            >
              {connected && shortAddress ? shortAddress : "Connect"}
            </button>
            <button className="p-1.5 hover:bg-surface-hover md:hidden text-primary" onClick={() => setMenuOpen(true)}>
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-[60] bg-black/50 transition-opacity duration-300 md:hidden ${menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setMenuOpen(false)}
      />

      <div
        className={`fixed top-0 right-0 z-[70] h-full w-64 bg-surface border-l border-border flex flex-col transition-transform duration-300 ease-in-out md:hidden ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="h-14 flex items-center justify-between px-4 border-b border-border shrink-0">
          <span className="font-mono text-sm font-semibold text-primary">Menu</span>
          <button className="p-1.5 hover:bg-surface-hover transition-colors text-primary" onClick={() => setMenuOpen(false)}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex flex-col flex-1 py-2">
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            className={`flex items-center px-5 py-3 text-sm border-b border-border hover:bg-surface-hover transition-colors ${pathname === '/' ? 'text-primary font-medium' : 'text-muted'}`}
          >
            Trade
          </Link>
          <Link
            href="/swap"
            onClick={() => setMenuOpen(false)}
            className={`flex items-center px-5 py-3 text-sm border-b border-border hover:bg-surface-hover transition-colors ${pathname === '/swap' ? 'text-primary font-medium' : 'text-muted'}`}
          >
            Swap
          </Link>
        </nav>

        <div className="px-5 py-4 border-t border-border shrink-0">
          <button
            onClick={handleConnect}
            className="w-full py-2 border border-border text-xs font-mono text-primary hover:bg-surface-hover transition-colors cursor-pointer"
          >
            {connected && shortAddress ? shortAddress : "Connect Wallet"}
          </button>
        </div>
      </div>
    </>
  );
}
