import LandingNavbar from "@/components/features/LandingNavbar";
import Hero from "@/components/features/Hero";
import Section2 from "@/components/features/Section2";
import Section3 from "@/components/features/Section3";
import Section4 from "@/components/features/Section4";
import CardBestOffer from "@/components/features/CardBestOffer";
import StripeMarquee from "@/components/features/StripeMarquee";

export default function Home() {
  return (
    <main className="flex flex-col">
      <LandingNavbar />
      <Hero />
      <Section2 />
      <div className="relative bg-[#38bdf8]">
        <StripeMarquee className="transform lg:rotate-3 translate-y-[-20%] lg:translate-x-[-5%]" />
        <CardBestOffer />
      </div>
      <Section3 />
      <div className="bg-[#fbf7ed] bg-grid-brutal">
        <StripeMarquee className="transform lg:-rotate-3 translate-y-[-20%] lg:translate-x-[-5%]" />
      </div>
      <div className="bg-[#f8672d]">
        <Section4 />
        <div className="bg-[#f8672d]">
          <StripeMarquee className="transform lg:rotate-3 translate-y-[-20%] lg:translate-x-[-5%]" />
        </div>
      </div>
    </main>
  );
}
