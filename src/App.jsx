// src/App.jsx
import { useEffect, useRef, useState } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';
import './index.css';

import BookingPanel from './components/BookingPanel';
import IncludedGames from './components/IncludedGames';
import ContactForm from './components/ContactForm';

function App() {
  const [showTop, setShowTop] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [menuOpen, setMenuOpen] = useState(false);
  const audioCtxRef = useRef(null);
  const panelRef = useRef(null);

  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const getAudioCtx = async () => {
    try {
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new Ctx();
        console.log('[Audio] AudioContext creado');
      }
      if (audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume();
        console.log('[Audio] AudioContext reanudado');
      }
      return audioCtxRef.current;
    } catch (e) {
      console.warn('[Audio] no disponible:', e);
      return null;
    }
  };

  const playSweep = async ({
    from = 300,
    to = 800,
    duration = 0.12,
    type = 'triangle',
    gain = 0.06,
    curve = 'linear',
  } = {}) => {
    if (reduceMotion) return;
    const ctx = await getAudioCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    const now = ctx.currentTime;
    const end = now + duration;

    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0002), now + duration * 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.frequency.setValueAtTime(from, now);
    if (curve === 'exp' && from > 0 && to > 0) {
      osc.frequency.exponentialRampToValueAtTime(to, end);
    } else {
      osc.frequency.linearRampToValueAtTime(to, end);
    }

    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(end + 0.02);
  };

  const sfxOpen = () => {
    playSweep({ from: 280, to: 900, duration: 0.14, type: 'triangle', gain: 0.07, curve: 'exp' });
    setTimeout(() => playSweep({ from: 600, to: 1000, duration: 0.07, type: 'sine', gain: 0.045 }), 50);
  };
  const sfxClose = () => {
    playSweep({ from: 520, to: 200, duration: 0.1, type: 'square', gain: 0.055, curve: 'exp' });
  };

  const toggleMenu = () => {
    setMenuOpen((prev) => {
      const next = !prev;
      console.log('[Menú]', next ? 'Abrir' : 'Cerrar');
      next ? sfxOpen() : sfxClose();
      return next;
    });
  };
  const closeMenu = () => {
    console.log('[Menú] Cerrar');
    setMenuOpen(false);
    sfxClose();
  };

  // Tema
  useEffect(() => {
    const saved = localStorage.getItem('lomevr-theme');
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved);
    } else {
      const sys = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      setTheme(sys);
    }
  }, []);
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('lomevr-theme', theme);
  }, [theme]);
  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  // AOS
  useEffect(() => {
    AOS.init({ duration: 400, easing: 'ease-in-out', once: true, disable: () => reduceMotion });
  }, [reduceMotion]);

  // Back-to-top
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ESC + bloquear scroll con menú
  useEffect(() => {
    document.body.classList.toggle('no-scroll', menuOpen);
    const onKey = (e) => {
      if (e.key === 'Escape') closeMenu();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  // Focus trap panel móvil
  useEffect(() => {
    if (!menuOpen) return;
    const focusables = panelRef.current
      ? panelRef.current.querySelectorAll('a,button,[tabindex]:not([tabindex="-1"])')
      : null;
    const first = focusables && focusables[0];
    const last = focusables && focusables[focusables.length - 1];
    const onKey = (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last && last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first && first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    first && first.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  // Actualiza meta theme-color
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#f7f9fb' : '#000000');
  }, [theme]);

  // Parallax suave en el hero (intro)
  useEffect(() => {
    if (reduceMotion) return;
    const host = document.querySelector('.hero');
    if (!host) return;
    const onMove = (e) => {
      const r = host.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) / r.width;
      const y = (e.clientY - (r.top + r.height / 2)) / r.height;
      host.style.setProperty('--parx', (x * 10).toFixed(2));
      host.style.setProperty('--pary', (y * 10).toFixed(2));
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [reduceMotion]);

  // Altura del header dinámica
  useEffect(() => {
    const nav = document.querySelector('nav.container-fluid');
    if (!nav) return;
    const setH = () => {
      document.documentElement.style.setProperty('--header-h', `${nav.offsetHeight}px`);
    };
    setH();
    const ro = new ResizeObserver(() => setH());
    ro.observe(nav);
    window.addEventListener('orientationchange', setH);
    window.addEventListener('resize', setH);
    return () => {
      ro.disconnect();
      window.removeEventListener('orientationchange', setH);
      window.removeEventListener('resize', setH);
    };
  }, []);

  const YT_EMBED_URL = 'https://www.youtube-nocookie.com/embed/hFCYfXwrf8s';

  return (
    <>
      {/* Accesibilidad */}
      <a className="skip-link" href="#contenido">Saltar al contenido</a>

      {/* Navbar */}
      <nav className="container-fluid">
        <ul>
          <li>
            <a href="/"><img src="/assets/Logo.png" alt="LOME VR" /></a>
          </li>
        </ul>

        {/* Links desktop */}
        <ul className="nav-links-desktop">
          <li><a href="#precios">Precios</a></li>
          <li><a href="#condiciones">Condiciones</a></li>
          <li><a href="#contacto" role="button">Contacto</a></li>
          <li>
            <button
              type="button"
              className="theme-toggle"
              aria-label="Cambiar tema"
              onClick={toggleTheme}
            >
              <span className="icon-wrap" aria-hidden="true">
                <svg className="icon sun" viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                  <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" fill="none" />
                  <line x1="12" y1="1" x2="12" y2="4" stroke="currentColor" strokeWidth="2" />
                  <line x1="12" y1="20" x2="12" y2="23" stroke="currentColor" strokeWidth="2" />
                  <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" stroke="currentColor" strokeWidth="2" />
                  <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="2" />
                  <line x1="1" y1="12" x2="4" y2="12" stroke="currentColor" strokeWidth="2" />
                  <line x1="20" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="2" />
                  <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" stroke="currentColor" strokeWidth="2" />
                  <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" stroke="currentColor" strokeWidth="2" />
                </svg>
                <svg className="icon moon" viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                  <path d="M21 12.79A9 9 0 0 1 12.21 3c-.11 0 -.22 0 -.33 .01A7 7 0 1 0 21 12.79Z" />
                </svg>
              </span>
            </button>
          </li>
        </ul>

        {/* Botón hamburguesa */}
        <button
          className={`hamburger ${menuOpen ? 'is-active' : ''}`}
          type="button"
          aria-label="Abrir menú"
          aria-controls="mobile-menu"
          aria-expanded={menuOpen}
          onClick={toggleMenu}
        >
          <span className="bar" />
          <span className="bar" />
          <span className="bar" />
        </button>
      </nav>

      {/* Overlay / Drawer Mobile */}
      <div
        id="mobile-menu"
        className={`mobile-menu ${menuOpen ? 'open' : ''}`}
        onClick={(e) => {
          if (e.target.classList.contains('mobile-menu')) closeMenu();
        }}
        aria-hidden={!menuOpen}
      >
        <button type="button" className="close-menu" aria-label="Cerrar menú" onClick={closeMenu} />
        <div ref={panelRef} className="mobile-menu__panel" role="dialog" aria-modal="true">
          <a href="#precios" className="mobile-link glitch" onClick={closeMenu} data-text="Precios">Precios</a>
          <a href="#condiciones" className="mobile-link glitch" onClick={closeMenu} data-text="Condiciones">Condiciones</a>
          <a href="#contacto" className="mobile-link glitch" onClick={closeMenu} data-text="Contacto">Contacto</a>

          <button
            type="button"
            className="theme-toggle mobile-theme"
            aria-label="Cambiar tema"
            onClick={toggleTheme}
          >
            <span className="icon-wrap" aria-hidden="true">
              <svg className="icon sun" viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" fill="none" />
                <line x1="12" y1="1" x2="12" y2="4" stroke="currentColor" strokeWidth="2" />
                <line x1="12" y1="20" x2="12" y2="23" stroke="currentColor" strokeWidth="2" />
                <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" stroke="currentColor" strokeWidth="2" />
                <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="2" />
                <line x1="1" y1="12" x2="4" y2="12" stroke="currentColor" strokeWidth="2" />
                <line x1="20" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="2" />
                <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" stroke="currentColor" strokeWidth="2" />
                <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" stroke="currentColor" strokeWidth="2" />
              </svg>
              <svg className="icon moon" viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                <path d="M21 12.79A9 9 0 0 1 12.21 3c-.11 0 -.22 0 -.33 .01A7 7 0 1 0 21 12.79Z" />
              </svg>
            </span>
          </button>
        </div>
      </div>

      {/* Main */}
      <main id="contenido">
        <h1 className="sr-only">Alquiler de visores VR — LOME VR</h1>

        {/* HERO */}
        <section className="hero" aria-label="Introducción a LOME VR">
          <div className="hero__bg" aria-hidden="true" />
          <div className="hero__overlay" aria-hidden="true" />
          <div className="hero__scan" aria-hidden="true" />
          <div className="hero__grid" aria-hidden="true" />
          <div className="hero__reveal" aria-hidden="true" />
          <div className="hero__particles" aria-hidden="true" />

          <div className="hero__content" data-aos="zoom-in">
            <h2
              className="hero__title glitch"
              data-text="La realidad virtual no se explica"
              data-aos="fade-up"
              data-aos-delay="160"
            >
              La realidad virtual no se explica
            </h2>
            <h3 className="hero__subtitle" data-aos="fade-up" data-aos-delay="240">¡Se vive!</h3>
            <p className="hero__lead" data-aos="fade-up" data-aos-delay="320">
              Animate a disfrutar esta experiencia única y dejate llevar a nuevos mundos.
            </p>
            <div className="hero__cta" data-aos="fade-up" data-aos-delay="380">
              <a href="#precios" className="btn btn-primary">Ver precios</a>
            </div>
          </div>
        </section>

        {/* CONTENIDOS */}
        <section className="container">
          <h3 data-aos="slide-right" id="precios" className="gamer-section">Precios</h3>
          <BookingPanel />

          <IncludedGames />

          <h3 data-aos="slide-right">Gameplay destacado</h3>
          <div className="video-wrapper">
            <div className="responsive-iframe">
              <iframe
                src={YT_EMBED_URL}
                title="Gameplay destacado (YouTube)"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
              />
            </div>
          </div>

          <h3 data-aos="slide-right">Qué incluye</h3>
          <p>
            Juegos y experiencias preinstaladas, batería extra (3 horas), asistencia técnica, entrega y retiro a
            domicilio, configuración simple y uso para PC.
          </p>

          <h3 data-aos="slide-right" id="condiciones" className="gamer-section">Condiciones de uso</h3>
          <div className="gamer-panel">
            <ul>
              <li>Se requiere WiFi</li>
              <li>Edad recomendada: 13+</li>
              <li>Identificación con domicilio para la entrega</li>
              <li>Si querés mostrar el visor en una pantalla, necesitás PC</li>
            </ul>
          </div>

          <h3 data-aos="slide-right">Sugerencias</h3>
          <ul>
            <li>Espacio mínimo de 2x2 metros</li>
            <li>Evitar muebles u objetos frágiles</li>
            <li>Buena luz y ventilación</li>
            <li>Limpiar el visor antes y después del uso</li>
            <li>Si usás PC, tener una mesa con buen espacio</li>
          </ul>

          <h3 data-aos="slide-right">Preguntas frecuentes</h3>
          <div className="faq">
            <details>
              <summary>¿Necesito PC o consola?</summary>
              <p>No, el visor funciona solo. Para transmitir a una pantalla o juegos de PC, necesitás una PC.</p>
            </details>
            <details>
              <summary>¿Hacen envío y retiro?</summary>
              <p>Sí, coordinamos entrega y retiro a domicilio en CABA (y GBA a convenir).</p>
            </details>
            <details>
              <summary>¿Qué pasa si daño el equipo?</summary>
              <p>Recomendamos el seguro opcional. Sin seguro, el daño puede tener costo según el caso.</p>
            </details>
          </div>
        </section>
      </main>

      {/* Formulario */}
      <section aria-label="Reservar experiencia" id="contacto">
        <div className="container">
          <article>
            <hgroup>
              <h2 data-aos="flip-up">Reservá tu experiencia VR</h2>
              <h3 data-aos="flip-up">Consultanos para eventos, promos o alquileres por semana</h3>
            </hgroup>
            <ContactForm />
          </article>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <p>
            <a href="mailto:lomevrarg@gmail.com" data-aos="zoom-in">
              <i className="fas fa-envelope"></i> lomevrarg@gmail.com
            </a>
            <a href="https://www.instagram.com/lome.vr" target="_blank" rel="noreferrer" data-aos="zoom-in">
              <i className="fab fa-instagram"></i> @lome.vr
            </a>
          </p>
          <p>
            <a href="tel:+5491150109307" data-aos="zoom-in">
              <i className="fas fa-phone"></i> +54 9 11 5010-9307
            </a>
          </p>
          <p data-aos="flip-up">
            <i className="fas fa-map-marker-alt"></i> Palermo, CABA
          </p>
          <small className="copy" data-aos="flip-up">
            © {new Date().getFullYear()} LOME VR — Todos los derechos reservados.
            <br />
            Hecho por <strong>Mena Web Developer</strong>
          </small>
        </div>
      </footer>

      {/* WhatsApp */}
      <a
        href="https://wa.me/5491150109307"
        className="whatsapp-float"
        target="_blank"
        rel="noreferrer"
        aria-label="Abrir WhatsApp"
      >
        <i className="fab fa-whatsapp"></i>
      </a>

      {/* Volver arriba */}
      <button
        className={`back-to-top ${showTop ? 'show' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Volver arriba"
      >
        <i className="fas fa-arrow-up"></i>
      </button>
    </>
  );
}

export default App;