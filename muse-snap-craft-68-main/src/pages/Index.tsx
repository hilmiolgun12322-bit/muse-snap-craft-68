import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Youtube, Instagram, Facebook } from "lucide-react";
import { toast } from "sonner";
import artwork1 from "@/assets/artwork-1.jpg";
import artwork2 from "@/assets/artwork-2.jpg";
import artwork3 from "@/assets/artwork-3.jpg";
import artwork4 from "@/assets/artwork-4.jpg";
import artwork5 from "@/assets/artwork-5.jpg";
import artwork6 from "@/assets/artwork-6.jpg";

const navItems = [
  { label: "About", href: "#about" },
  { label: "Originals", href: "#originals" },
  { label: "Prints", href: "#prints" },
  { label: "Book", href: "#book" },
  { label: "Contact", href: "#contact" },
];

const originals = [
  { title: "World Map from Memory", desc: "Original painting on canvas, 24x36 inches", price: "$850", img: artwork1 },
  { title: "European Coastlines", desc: "Original painting on canvas, 18x24 inches", price: "$650", img: artwork2 },
  { title: "Pacific Islands", desc: "Original painting on canvas, 30x40 inches", price: "$950", img: artwork3 },
];

const prints = [
  { title: "Continental Drift", desc: "Fine art print, limited edition of 50", price: "$75", img: artwork4 },
  { title: "Mediterranean Dreams", desc: "Fine art print, limited edition of 50", price: "$85", img: artwork5 },
];

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.91a8.16 8.16 0 0 0 4.77 1.52V7a4.85 4.85 0 0 1-1.84-.31z" />
  </svg>
);

const Index = () => {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [website, setWebsite] = useState(""); // honeypot — must stay empty
  const [formLoadedAt] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Please fill in all fields");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-contact-email", {
        body: { ...form, website, elapsedMs: Date.now() - formLoadedAt },
      });
      if (error || !data?.success) {
        throw new Error(error?.message ?? data?.error ?? "Failed to send");
      }
      toast.success("Message sent. Thank you for reaching out.");
      setForm({ name: "", email: "", message: "" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-background/40 border-b border-border/30">
        <nav className="container flex items-center justify-between h-20">
          <a href="#top" className="text-sm tracking-[0.4em] font-medium text-foreground">
            HILMI OLGUN
          </a>
          <ul className="hidden md:flex items-center gap-10">
            {navItems.map((item) => (
              <li key={item.label}>
                <a href={item.href} className="nav-link">{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="top">
        {/* Hero */}
        <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20">
          <p className="eyebrow mb-8">Art Born From Memory</p>
          <h1 className="text-6xl md:text-8xl lg:text-9xl tracking-tight mb-10 font-medium">
            HILMI OLGUN
          </h1>
          <p className="max-w-2xl text-lg md:text-xl text-foreground/75 leading-relaxed italic mb-12">
            All my maps are drawn from memory. It is my goal and life pursuit to learn about
            all cultures and nations throughout the world. For the world is beautiful, and full
            of love, full of things to discover.
          </p>
          <a
            href="#originals"
            className="inline-block px-10 py-4 border border-foreground/60 text-sm tracking-[0.25em] uppercase hover:bg-foreground hover:text-background transition-all duration-500"
          >
            Explore the Work
          </a>
        </section>

        {/* About / Process */}
        <section id="about" className="py-32 px-6">
          <div className="container grid md:grid-cols-2 gap-16 items-center">
            <div className="order-2 md:order-1">
              <p className="eyebrow mb-6">The Process</p>
              <h2 className="text-5xl md:text-6xl mb-8">Memory as Medium</h2>
              <div className="space-y-6 text-lg text-foreground/75 leading-relaxed">
                <p>
                  Without reference materials, I translate mental images of continents, coastlines,
                  and territories onto canvas. The resulting artworks reveal how we internalize
                  and reimagine the world around us.
                </p>
                <p>
                  Each painting is an original work, ranging from $500 to $1,000 depending on size
                  and complexity. Limited edition prints are also available for collectors.
                </p>
              </div>
            </div>
            <div className="order-1 md:order-2 artwork-frame">
              <img
                src={artwork1}
                alt="Memory map painting in deep red and slate blue"
                width={1024}
                height={1024}
                loading="lazy"
                className="w-full h-auto"
              />
            </div>
          </div>
        </section>

        {/* Originals */}
        <section id="originals" className="py-32 px-6">
          <div className="container">
            <div className="text-center mb-20">
              <p className="eyebrow mb-6">Available Now</p>
              <h2 className="text-5xl md:text-6xl mb-6">Original Paintings</h2>
              <p className="text-lg text-foreground/70 italic max-w-2xl mx-auto">
                One-of-a-kind pieces, each map drawn entirely from memory.
                Original works range from $500–$1,000.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-10">
              {originals.map((p) => (
                <article key={p.title}>
                  <div className="artwork-frame aspect-square mb-6">
                    <img
                      src={p.img}
                      alt={p.title}
                      width={1024}
                      height={1024}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="text-2xl mb-2">{p.title}</h3>
                  <p className="text-sm text-muted-foreground italic mb-2">{p.desc}</p>
                  <p className="text-lg text-foreground/90">{p.price}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Prints */}
        <section id="prints" className="py-32 px-6">
          <div className="container">
            <div className="text-center mb-20">
              <p className="eyebrow mb-6">Limited Editions</p>
              <h2 className="text-5xl md:text-6xl mb-6">Fine Art Prints</h2>
              <p className="text-lg text-foreground/70 italic max-w-2xl mx-auto">
                Museum-quality reproductions of select works. Each edition is limited to 50 prints,
                signed and numbered.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-10 max-w-5xl mx-auto">
              {prints.map((p) => (
                <article key={p.title}>
                  <div className="artwork-frame aspect-[4/3] mb-6">
                    <img
                      src={p.img}
                      alt={p.title}
                      width={1024}
                      height={768}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="text-2xl mb-2">{p.title}</h3>
                  <p className="text-sm text-muted-foreground italic mb-2">{p.desc}</p>
                  <p className="text-lg text-foreground/90">{p.price}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Book */}
        <section id="book" className="py-32 px-6">
          <div className="container grid md:grid-cols-2 gap-16 items-center">
            <div className="artwork-frame">
              <img
                src={artwork6}
                alt="The Atlas of Memory book preview"
                width={1024}
                height={1024}
                loading="lazy"
                className="w-full h-auto"
              />
            </div>
            <div>
              <p className="eyebrow mb-6">Coming Soon</p>
              <h2 className="text-5xl md:text-6xl mb-8">The Atlas of Memory</h2>
              <div className="space-y-6 text-lg text-foreground/75 leading-relaxed">
                <p>
                  A comprehensive collection exploring the art and philosophy behind drawing maps
                  from memory. Featuring over 100 original works, process documentation, and
                  essays on cartography, consciousness, and creative practice.
                </p>
                <p>Pre-orders opening soon. Sign up below to be notified at launch.</p>
              </div>
              <a
                href="#contact"
                className="mt-10 inline-block px-10 py-4 border border-foreground/60 text-sm tracking-[0.25em] uppercase hover:bg-foreground hover:text-background transition-all duration-500"
              >
                Notify Me
              </a>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="py-32 px-6">
          <div className="container max-w-2xl">
            <div className="text-center mb-16">
              <p className="eyebrow mb-6">Get In Touch</p>
              <h2 className="text-5xl md:text-6xl mb-6">Let's Connect</h2>
              <p className="text-lg text-foreground/70 italic">
                Interested in commissioning a piece, discussing a collaboration, or learning more
                about the work? I'd love to hear from you.
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Honeypot — hidden from real users, bots will fill it */}
              <div aria-hidden="true" className="absolute left-[-9999px] w-px h-px overflow-hidden">
                <label htmlFor="website">Website</label>
                <input
                  type="text"
                  id="website"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>
              <input
                type="text"
                placeholder="Your Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-input/50 border border-border px-5 py-4 text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-foreground/60 transition-colors"
              />
              <input
                type="email"
                placeholder="Your Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-input/50 border border-border px-5 py-4 text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-foreground/60 transition-colors"
              />
              <textarea
                placeholder="Your Message"
                rows={6}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full bg-input/50 border border-border px-5 py-4 text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-foreground/60 transition-colors resize-none"
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-3 border border-foreground/60 px-5 py-4 text-sm tracking-[0.25em] uppercase hover:bg-foreground hover:text-background transition-all duration-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Mail className="w-4 h-4" />
                {submitting ? "Sending..." : "Send Message"}
              </button>
            </form>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12 px-6">
        <div className="container flex flex-col items-center gap-6">
          <div className="flex items-center gap-8 text-foreground/60">
            <a href="#" aria-label="YouTube" className="hover:text-foreground transition-colors"><Youtube className="w-5 h-5" /></a>
            <a href="#" aria-label="Instagram" className="hover:text-foreground transition-colors"><Instagram className="w-5 h-5" /></a>
            <a href="#" aria-label="TikTok" className="hover:text-foreground transition-colors"><TikTokIcon className="w-5 h-5" /></a>
            <a href="#" aria-label="Facebook" className="hover:text-foreground transition-colors"><Facebook className="w-5 h-5" /></a>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground italic">
            <span>© 2026 Hilmi Olgun. All rights reserved.</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
            <span className="tracking-[0.3em] uppercase not-italic text-xs">Art Born From Memory</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
