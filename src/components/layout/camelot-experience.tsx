"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const galleries = [
  {
    category: "interior",
    title: "The Main Hall",
    image: "/assets/tour-main-hall.png",
    alt: "Camelot main hall rendering",
    shape: "wide",
  },
  {
    category: "interior",
    title: "Royal Booths",
    image: "/assets/booth-couch.webp",
    alt: "Camelot velvet booth seating concept",
    shape: "tall",
  },
  {
    category: "identity",
    title: "The Crest",
    image: "/assets/bottle-tags.webp",
    alt: "Camelot bottle tag identity concepts",
  },
  {
    category: "interior",
    title: "The Banquet Table",
    image: "/assets/cable-chair.webp",
    alt: "Camelot banquet table and chair concept",
  },
  {
    category: "identity",
    title: "Table as Theatre",
    image: "/assets/centerpieces-wide.webp",
    alt: "Camelot candle and floral tablescape concept",
    shape: "wide",
  },
  {
    category: "identity",
    title: "Bar Details",
    image: "/assets/bar-napkin.webp",
    alt: "Camelot bar napkin identity concepts",
  },
  {
    category: "digital",
    title: "Connected Table",
    image: "/assets/camelot-tablet.webp",
    alt: "Illustrative Camelot table interface concept",
  },
  {
    category: "digital",
    title: "The Camelot App",
    image: "/assets/camelot-app-grid.webp",
    alt: "Illustrative Camelot mobile app concepts",
  },
  {
    category: "identity",
    title: "Welcome Ritual",
    image: "/assets/welcome-drinks.webp",
    alt: "Camelot welcome drink presentation concept",
    shape: "wide",
  },
  {
    category: "identity",
    title: "The Menu",
    image: "/assets/menu-books.webp",
    alt: "Camelot menu book concepts",
  },
  {
    category: "identity",
    title: "Signature Glassware",
    image: "/assets/cocktail-glassware.webp",
    alt: "Camelot cocktail glassware concepts",
  },
];

const rooms = [
  {
    title: "The Main Hall",
    label: "Main Hall",
    image: "/assets/tour-main-hall.png",
    description:
      "The heart of Camelot: dining, performance, cinematic screens and theatrical lighting composed within one room.",
  },
  {
    title: "Royal Booths",
    label: "Royal Booths",
    image: "/assets/booth-couch.webp",
    description:
      "Oxblood velvet, charcoal quilting and warm gold light shape intimate enclaves within the larger experience.",
  },
  {
    title: "The Private Lounge",
    label: "Private Lounge",
    image: "/assets/tour-mens-room.png",
    description:
      "A sculpted late-night room with immersive screens, reflective surfaces and an otherworldly atmosphere.",
  },
  {
    title: "The Banquet Table",
    label: "Banquet Table",
    image: "/assets/cable-chair.webp",
    description:
      "A ceremonial dining setting where carved silhouettes, lion crests and candlelight carry the Camelot story.",
  },
];

const products = [
  {
    category: "Tableware",
    title: "The Camelot Plate",
    image: "/assets/table-service.webp",
    alt: "Illustrative Camelot plate and tableware concept",
  },
  {
    category: "Textiles",
    title: "House Napkins",
    image: "/assets/bar-napkin.webp",
    alt: "Illustrative Camelot bar napkin collection",
  },
  {
    category: "Barware",
    title: "Signature Glassware",
    image: "/assets/cocktail-glassware.webp",
    alt: "Illustrative Camelot cocktail glassware concept",
  },
];

const tourUrl =
  "https://vr.justeasy.cn/view/w1me6u894i0610g3-1758796686.html";

export function CamelotExperience() {
  const [filter, setFilter] = useState("all");
  const [selectedImage, setSelectedImage] = useState<
    (typeof galleries)[number] | null
  >(null);
  const [roomIndex, setRoomIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [heroFilmPlaying, setHeroFilmPlaying] = useState(true);
  const lightboxRef = useRef<HTMLDialogElement>(null);
  const heroFilmRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    document.body.classList.add("camelot-interactive");
    return () => document.body.classList.remove("camelot-interactive");
  }, []);

  useEffect(() => {
    const revealElements = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      revealElements.forEach((element) => element.classList.add("visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );

    revealElements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [filter]);

  useEffect(() => {
    document.body.classList.toggle("menu-open", menuOpen);
    return () => document.body.classList.remove("menu-open");
  }, [menuOpen]);

  useEffect(() => {
    const dialog = lightboxRef.current;
    if (!dialog) return;
    if (selectedImage && !dialog.open) dialog.showModal();
    if (!selectedImage && dialog.open) dialog.close();
  }, [selectedImage]);

  useEffect(() => {
    const updateScroll = () => {
      const maximum =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress =
        maximum > 0 ? (window.scrollY / maximum) * 100 : 0;
      document.documentElement.style.setProperty(
        "--scroll-y",
        `${window.scrollY * 0.09}px`,
      );
      document.querySelector<HTMLElement>(".page-progress")!.style.width =
        `${progress}%`;
    };

    window.addEventListener("scroll", updateScroll, { passive: true });
    updateScroll();
    return () => window.removeEventListener("scroll", updateScroll);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  const toggleHeroFilm = async () => {
    const film = heroFilmRef.current;
    if (!film) return;
    if (film.paused) {
      try {
        await film.play();
        setHeroFilmPlaying(true);
      } catch {
        setHeroFilmPlaying(false);
      }
    } else {
      film.pause();
      setHeroFilmPlaying(false);
    }
  };

  return (
    <>
      <div className="noise" aria-hidden="true" />
      <div className="page-progress" aria-hidden="true" />
      <header className="nav" aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label="Camelot home">
          <Image
            src="/assets/camelot-mark.jpg"
            alt="Camelot"
            width={52}
            height={52}
            priority
          />
        </a>
        <nav aria-label="Main navigation">
          <a href="#experience" onClick={closeMenu}>
            Experience
          </a>
          <a href="#performance" onClick={closeMenu}>
            What&apos;s On
          </a>
          <a href="#menu" onClick={closeMenu}>
            Food &amp; Drinks
          </a>
          <a href="#spaces" onClick={closeMenu}>
            Venue
          </a>
          <a href="#reserve" onClick={closeMenu}>
            Private Events
          </a>
        </nav>
        <a className="nav-cta" href="#reserve">
          Opening updates <span>↓</span>
        </a>
        <button
          className="menu"
          type="button"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
        </button>
      </header>

      <div id="top">
        <section className="hero">
          <video
            ref={heroFilmRef}
            className="hero-film"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/assets/booth-couch.webp"
            aria-label="Camelot venue concept film"
            onPlay={() => setHeroFilmPlaying(true)}
            onPause={() => setHeroFilmPlaying(false)}
          >
            <source
              src="/assets/camelot-vision-clean.m4v"
              type="video/x-m4v"
            />
          </video>
          <div className="hero-shade" aria-hidden="true" />
          <div className="hero-copy reveal">
            <p className="eyebrow">In development · Downtown Riverside</p>
            <h1>
              One destination.
              <br />
              <em>An entire night.</em>
            </h1>
            <p className="lede">
              Modern American cuisine with Asian influence, signature
              cocktails, live performance and immersive environments—created
              together in Downtown Riverside.
            </p>
            <p className="launch-note">
              <span />
              Opening details to be announced
            </p>
            <div className="actions">
              <a className="button primary" href="#experience">
                Explore the experience <span>↓</span>
              </a>
              <a className="button text" href="#menu">
                Food &amp; drinks <span>↓</span>
              </a>
            </div>
            <div className="hero-promise" aria-label="Camelot experience">
              <span>Dinner</span>
              <i />
              <span>Performance</span>
              <i />
              <span>After dark</span>
            </div>
          </div>
          <div className="hero-crest reveal delay">
            <Image
              src="/assets/camelot-logo.png"
              alt="Camelot monogram and wordmark"
              width={390}
              height={390}
              priority
            />
          </div>
          <div className="scroll-note">
            Scroll to enter <i />
          </div>
          <button
            className="hero-film-toggle"
            type="button"
            aria-label={
              heroFilmPlaying ? "Pause background film" : "Play background film"
            }
            onClick={toggleHeroFilm}
          >
            {heroFilmPlaying ? "Pause film" : "Play film"}
          </button>
        </section>
        <div className="experience-strip" aria-label="Camelot experience">
          <span>Dining</span>
          <i />
          <span>Live Performance</span>
          <i />
          <span>Immersive Storytelling</span>
          <i />
          <span>Private Celebrations</span>
        </div>

        <section className="gallery" id="gallery">
          <div className="gallery-top reveal">
            <div>
              <p className="eyebrow">Explore the world</p>
              <h2>
                A closer look
                <br />
                at Camelot.
              </h2>
              <p className="gallery-note">
                Selected concept visualizations communicate the intended
                atmosphere and guest experience. Final details may evolve
                during development.
              </p>
            </div>
            <div className="gallery-controls" role="group" aria-label="Filter gallery">
              {["all", "interior", "identity", "digital"].map((item) => (
                <button
                  className={filter === item ? "active" : ""}
                  type="button"
                  key={item}
                  aria-pressed={filter === item}
                  onClick={() => setFilter(item)}
                >
                  {item === "all" ? "All" : item === "interior" ? "Interiors" : item}
                </button>
              ))}
            </div>
          </div>
          <div className="gallery-grid">
            {galleries
              .filter((item) => filter === "all" || item.category === filter)
              .map((item) => (
                <button
                  className={`gallery-item reveal ${item.shape ?? ""}`}
                  type="button"
                  key={item.title}
                  onClick={() => setSelectedImage(item)}
                  aria-label={`View ${item.title}`}
                >
                  <Image
                    src={item.image}
                    alt={item.alt}
                    width={960}
                    height={700}
                  />
                  <span>{item.title}</span>
                </button>
              ))}
          </div>
        </section>

        <section className="desire-sequence" id="experience" aria-label="The Camelot evening">
          <div className="desire-heading">
            <p className="eyebrow">Why Camelot</p>
            <h2>
              Not dinner beside a show.
              <br />
              <em>Dinner inside the experience.</em>
            </h2>
            <p>
              Every part of the evening—food, drinks, performance, light and
              sound—is designed to belong to the same world.
            </p>
          </div>
          <div className="desire-panels">
            {[
              {
                title: "Taste",
                subtitle: "Modern American · Asian influence",
                image: "/assets/table-service.webp",
                alt: "Illustrative Camelot dining presentation",
              },
              {
                title: "Watch",
                subtitle: "Live performance · Stagecraft",
                image: "/assets/tour-main-hall.png",
                alt: "Camelot main hall architectural rendering",
                featured: true,
              },
              {
                title: "Enter",
                subtitle: "Light · Sound · Multimedia worlds",
                image: "/assets/cocktail-glassware.webp",
                alt: "Illustrative Camelot cocktail presentation",
              },
            ].map((item, index) => (
              <figure
                className={item.featured ? "featured" : ""}
                key={item.title}
              >
                <Image
                  src={item.image}
                  alt={item.alt}
                  width={1000}
                  height={1200}
                />
                <figcaption>
                  <span>0{index + 1}</span>
                  <strong>{item.title}</strong>
                  <small>{item.subtitle}</small>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="performance-feature" id="performance">
          <div className="performance-heading">
            <p className="eyebrow">What&apos;s on · Programming vision</p>
            <h2>
              A reason to return.
              <br />
              <em>Night after night.</em>
            </h2>
            <p>
              Camelot is being designed for an evolving calendar of live music,
              featured performances, immersive content and special nights.
              Confirmed artists and dates will appear here when booking begins.
            </p>
          </div>
          <div className="performance-stage">
            <figure className="performance-film">
              <video
                controls
                muted
                loop
                playsInline
                preload="metadata"
                poster="/assets/tour-main-hall.png"
                aria-label="Camelot live performance and venue concept film"
              >
                <source
                  src="/assets/camelot-vision-clean.m4v"
                  type="video/x-m4v"
                />
              </video>
              <figcaption>
                <span>Concept film</span>
                <strong>Camelot in motion</strong>
              </figcaption>
            </figure>
            <div className="performance-stills">
              <figure>
                <Image
                  src="/assets/tour-main-hall.png"
                  alt="Camelot main hall stage architectural rendering"
                  width={900}
                  height={500}
                />
                <figcaption>Main Hall · Stage vision</figcaption>
              </figure>
              <figure>
                <Image
                  src="/assets/booth-couch.webp"
                  alt="Camelot audience booth seating concept"
                  width={900}
                  height={500}
                />
                <figcaption>Royal Booths · Audience experience</figcaption>
              </figure>
            </div>
          </div>
          <div className="programming-grid reveal" aria-label="Planned Camelot programming">
            {[
              {
                title: "Live Music",
                description:
                  "Artist-led evenings shaped for the room, the table and the energy of the night.",
              },
              {
                title: "Featured Performance",
                description:
                  "Curated stage moments that give guests something worth arriving for and talking about afterward.",
              },
              {
                title: "Immersive Nights",
                description:
                  "Seasonal multimedia worlds that transform the Main Hall and create new reasons to return.",
              },
            ].map((item, index) => (
              <article key={item.title}>
                <span>0{index + 1}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="menu-preview" id="menu">
          <div className="menu-intro reveal">
            <p className="eyebrow">Food &amp; drinks · Culinary direction</p>
            <h2>
              Designed for
              <br />
              <em>the entire night.</em>
            </h2>
            <p>
              Modern American cooking with Asian influence, structured for
              sharing, celebration and a natural progression from the first
              plate to the final cocktail. Final dishes and pricing will follow
              culinary development.
            </p>
            <a className="button text" href="#reserve">
              Request opening updates <span>↓</span>
            </a>
          </div>
          <div className="menu-stories">
            {[
              {
                category: "01 · To begin",
                title: "Opening Plates",
                image: "/assets/menu-short-rib.png",
                alt: "Illustrative Camelot glazed short rib menu concept",
                description:
                  "Shareable dishes · bright flavor · immediate energy",
              },
              {
                category: "02 · The table",
                title: "Flame & Sea",
                image: "/assets/menu-scallops.png",
                alt: "Illustrative Camelot seared scallop menu concept",
                description:
                  "Signature mains · large-format dishes · seasonal sides",
              },
              {
                category: "03 · After dark",
                title: "Bar & Final Act",
                image: "/assets/menu-ruby-cocktail.png",
                alt: "Illustrative ruby-colored Camelot cocktail concept",
                description:
                  "Signature cocktails · zero-proof · desserts · reserve bottles",
              },
            ].map((item) => (
              <article className="menu-story reveal" key={item.title}>
                <Image
                  src={item.image}
                  alt={item.alt}
                  width={1200}
                  height={750}
                />
                <div>
                  <span>{item.category}</span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="three-worlds" aria-label="Camelot experience pillars">
          {[
            {
              eyebrow: "Cuisine",
              title: "Flavor with theatre.",
              description:
                "Modern American Asian Fusion envisioned as an expressive culinary journey—not an afterthought to the show.",
              image: "/assets/table-service.webp",
              alt: "Camelot table service concept",
            },
            {
              eyebrow: "Entertainment",
              title: "The room becomes the performance.",
              description:
                "Stage, lighting, sound and multimedia content combine to create a different emotional world around every gathering.",
              image: "/assets/tour-main-hall.png",
              alt: "Camelot live stage and entertainment hall",
            },
            {
              eyebrow: "Hospitality",
              title: "Every ritual carries the crest.",
              description:
                "From the welcome drink to the final detail, the Camelot identity is designed to feel intentional, tactile and memorable.",
              image: "/assets/cocktail-glassware.webp",
              alt: "Camelot cocktail glassware concept",
            },
          ].map((world, index) => (
            <article className="world reveal" key={world.eyebrow}>
              <Image
                src={world.image}
                alt={world.alt}
                fill
                sizes="(max-width: 850px) 100vw, 33vw"
              />
              <div>
                <span>0{index + 1}</span>
                <p className="eyebrow">{world.eyebrow}</p>
                <h2>{world.title}</h2>
                <p>{world.description}</p>
              </div>
            </article>
          ))}
        </section>
        <div className="royal-marquee" aria-hidden="true">
          <div>
            CAMELOT · CUISINE · LIVE PERFORMANCE · IMMERSIVE STORYTELLING ·
            CAMELOT · CUISINE · LIVE PERFORMANCE · IMMERSIVE STORYTELLING ·
          </div>
        </div>

        <section className="room-explorer" id="spaces">
          <div className="room-visual reveal">
            <Image
              src={rooms[roomIndex].image}
              alt={rooms[roomIndex].title}
              id="room-image"
              width={1200}
              height={1000}
            />
            <div className="room-number">0{roomIndex + 1}</div>
          </div>
          <div className="room-panel reveal">
            <p className="eyebrow">The venue · Built for the full evening</p>
            <h2>{rooms[roomIndex].title}</h2>
            <p>{rooms[roomIndex].description}</p>
            <div className="room-tabs" role="tablist" aria-label="Camelot spaces">
              {rooms.map((room, index) => (
                <button
                  className={roomIndex === index ? "active" : ""}
                  type="button"
                  role="tab"
                  aria-selected={roomIndex === index}
                  key={room.title}
                  onClick={() => setRoomIndex(index)}
                >
                  <span>0{index + 1}</span>
                  {room.label}
                </button>
              ))}
            </div>
            <a
              className="button text"
              href={tourUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Walk through in 360° <span>↗</span>
            </a>
          </div>
        </section>

        <section className="reserve-section" id="reserve">
          <div className="reserve-heading reveal">
            <p className="eyebrow">
              Dining · Celebrations · Private events
            </p>
            <h2>
              Choose your reason
              <br />
              <em>to enter Camelot.</em>
            </h2>
            <p>
              Opening reservations and private-event inquiries will launch
              here after operating details and guest systems are confirmed.
            </p>
          </div>
          <div className="reserve-options">
            <article className="reserve-card table-card reveal">
              <span>01</span>
              <p className="eyebrow">Dinner &amp; Performance</p>
              <h3>Your Night at Camelot</h3>
              <p>
                Future access to opening reservations, food-and-drink previews
                and confirmed programming.
              </p>
              <span className="button primary status-button" aria-disabled="true">
                Opening list coming soon
              </span>
            </article>
            <article className="reserve-card buyout-card reveal">
              <span>02</span>
              <p className="eyebrow">Private Events</p>
              <h3>Make the Room Yours</h3>
              <p>
                Milestone celebrations, corporate gatherings, private-room
                experiences and full-venue buyouts are planned.
              </p>
              <span className="button text status-button" aria-disabled="true">
                Event inquiries coming soon
              </span>
            </article>
            <article className="reserve-card bottle-card reveal">
              <span>03</span>
              <p className="eyebrow">Opening Updates</p>
              <h3>Be First Inside</h3>
              <p>
                Opening news, preview opportunities and confirmed event
                announcements will be available here.
              </p>
              <span className="button text status-button" aria-disabled="true">
                Updates coming soon
              </span>
            </article>
          </div>
        </section>

        <section className="visit-section" id="visit">
          <div className="visit-heading reveal">
            <p className="eyebrow">Plan your visit</p>
            <h2>
              Downtown Riverside.
              <br />
              <em>Details to follow.</em>
            </h2>
            <p>
              Camelot is currently in development. The opening date, operating
              hours, parking guidance, dress guidance and reservation policies
              will be published here when confirmed.
            </p>
          </div>
          <div className="visit-facts reveal">
            <div>
              <span>Location</span>
              <strong>Downtown Riverside, California</strong>
            </div>
            <div>
              <span>Opening</span>
              <strong>To be announced</strong>
            </div>
            <div>
              <span>Reservations</span>
              <strong>Not yet open</strong>
            </div>
          </div>
        </section>

        <section className="details" id="details">
          <div className="details-heading reveal">
            <p className="eyebrow">The Camelot language</p>
            <h2>
              Every detail belongs
              <br />
              to the same kingdom.
            </h2>
            <p>
              From the lounge to the tabletop, the identity is tactile, warm
              and unmistakably Camelot.
            </p>
          </div>
          <div className="detail-grid">
            {[
              {
                image: "/assets/booth-couch.webp",
                alt: "Camelot booth seating concept in oxblood velvet, charcoal and gold",
                caption: "Velvet & brass",
              },
              {
                image: "/assets/bar-napkin.webp",
                alt: "Camelot bar napkin branding concepts",
                caption: "Branded ritual",
              },
              {
                image: "/assets/centerpiece.webp",
                alt: "Camelot floral and candle centerpiece concept",
                caption: "The table as theatre",
              },
            ].map((item, index) => (
              <figure
                className={`${index === 0 ? "detail-large " : ""}reveal`}
                key={item.caption}
              >
                <Image src={item.image} alt={item.alt} width={1000} height={900} />
                <figcaption>
                  <span>0{index + 1}</span> {item.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="spaces" id="moments">
          <div className="section-heading reveal">
            <p className="eyebrow">The night is yours</p>
            <h2>
              Three reasons to
              <br />
              enter the kingdom.
            </h2>
          </div>
          <div className="space-grid">
            {[
              {
                title: "Dinner as an Event",
                description:
                  "For guests who want cuisine, service and atmosphere to carry the same creative ambition.",
                className: "main-hall",
              },
              {
                title: "Private Celebrations",
                description:
                  "For milestone nights that deserve a setting with its own identity, energy and sense of occasion.",
                className: "party-room",
              },
              {
                title: "Live Nights",
                description:
                  "For evenings shaped by stagecraft, music, multimedia storytelling and collective energy.",
                className: "lounge",
              },
            ].map((space, index) => (
              <article
                className={`space-card ${space.className} reveal`}
                key={space.title}
              >
                <div className="num">0{index + 1}</div>
                <div>
                  <h3>{space.title}</h3>
                  <p>{space.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="design" id="design">
          <div className="facade reveal">
            <Image
              src="/assets/camelot-real-exterior.png"
              alt="Architectural rendering of the planned Camelot building exterior"
              width={1400}
              height={1000}
            />
          </div>
          <div className="design-copy reveal">
            <p className="eyebrow">The planned exterior</p>
            <h2>
              Restrained outside.
              <br />
              Transportive within.
            </h2>
            <p>
              The architectural rendering shows Camelot&apos;s planned
              Downtown Riverside façade. Inside, black lacquer, oxblood
              textiles, antique gold, layered light and multimedia scenography
              define the visual language.
            </p>
            <div className="material-row">
              <span>Black lacquer</span>
              <span>Oxblood velvet</span>
              <span>Antique gold</span>
              <span>Candlelight</span>
            </div>
          </div>
        </section>

        <section className="collection" id="collection">
          <div className="collection-heading reveal">
            <p className="eyebrow">Camelot at home</p>
            <h2>The house collection.</h2>
            <p>
              A future extension of the Camelot experience. Tableware,
              textiles and barware will be introduced only after products,
              pricing and fulfillment are confirmed.
            </p>
          </div>
          <div className="collection-grid">
            {products.map((product) => (
              <article className="product-card reveal" key={product.title}>
                <Image
                  src={product.image}
                  alt={product.alt}
                  width={800}
                  height={1000}
                />
                <div>
                  <p>{product.category}</p>
                  <h3>{product.title}</h3>
                  <span className="product-status">
                    Concept in development
                  </span>
                </div>
              </article>
            ))}
          </div>
          <div className="store-note reveal">
            <span>Future house collection</span>
            <p>
              Commerce will open only after product design, pricing,
              inventory, fulfillment and customer service are confirmed.
            </p>
          </div>
        </section>

        <section className="digital">
          <div className="digital-copy reveal">
            <p className="eyebrow">A connected experience</p>
            <h2>
              The house identity,
              <br />
              carried to every touchpoint.
            </h2>
            <p>
              Illustrative concepts explore how reservations, events and VIP
              moments could continue the Camelot aesthetic beyond the room.
            </p>
          </div>
          <div className="digital-images reveal">
            <Image
              src="/assets/camelot-app.webp"
              alt="Illustrative Camelot mobile interface concept"
              width={800}
              height={1000}
            />
            <Image
              src="/assets/camelot-tablet.webp"
              alt="Illustrative Camelot tabletop interface concept"
              width={800}
              height={1000}
            />
          </div>
        </section>

        <section className="closing">
          <Image
            src="/assets/camelot-crest.png"
            alt=""
            aria-hidden="true"
            width={180}
            height={180}
          />
          <p className="eyebrow">
            Currently in development · Downtown Riverside
          </p>
          <h2>
            A new world
            <br />
            is taking <em>shape.</em>
          </h2>
          <p className="closing-copy">
            Explore the architectural vision now. Opening details,
            reservations and confirmed programming will follow.
          </p>
          <a
            className="button primary"
            href={tourUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Enter the 360° preview <span>↗</span>
          </a>
        </section>
      </div>

      <a className="mobile-reserve" href="#reserve">
        <span>Opening updates</span>
        <b>↓</b>
      </a>

      <footer className="camelot-footer">
        <Image
          src="/assets/camelot-mark.jpg"
          alt="Camelot"
          width={52}
          height={52}
        />
        <p>
          Dining · Performance · Private Celebrations · House Collection
        </p>
        <p>© 2026 Camelot</p>
        <Link href="/login">Account access</Link>
      </footer>

      <dialog
        className="lightbox"
        aria-label="Image preview"
        ref={lightboxRef}
        onClose={() => setSelectedImage(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            (event.currentTarget as HTMLDialogElement).close();
          }
        }}
      >
        <button
          className="lightbox-close"
          type="button"
          aria-label="Close image preview"
          onClick={() => lightboxRef.current?.close()}
        >
          ×
        </button>
        {selectedImage && (
          <Image
            src={selectedImage.image}
            alt={selectedImage.alt}
            width={1600}
            height={1200}
          />
        )}
        <p>{selectedImage?.title}</p>
      </dialog>

    </>
  );
}
