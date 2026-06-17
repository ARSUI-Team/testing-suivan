import Image from "next/image";
import Link from "next/link";

const Navbar = () => {
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-sm">
      <Link href="/" className="flex items-center gap-2.5">
        <Image
          src="/suivan-logo.png"
          alt="SUIVAN"
          width={40}
          height={40}
          className="h-10 w-10 object-contain"
        />
        <span className="flex flex-col items-start leading-none">
          <span
            className="text-2xl font-black text-[#0a0a0a]"
            style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", letterSpacing: "0.02em" }}
          >
            SUIVAN
          </span>
          <span className="text-[8px] font-semibold uppercase tracking-[0.3em] text-[#38bdf8]">
            COMMUNITY WEALTH PROTOCOL
          </span>
        </span>
      </Link>
      <Link
        href="/pools"
        className="px-5 py-2 text-sm font-black text-[#0a0a0a] bg-[#38bdf8] border-[3px] border-[#0a0a0a] shadow-[4px_4px_0_#0a0a0a] hover:bg-[#0a0a0a] hover:text-[#38bdf8] transition-colors"
        style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", letterSpacing: "0.08em" }}
      >
        LAUNCH DAPP
      </Link>
    </header>
  );
};

export default Navbar;
