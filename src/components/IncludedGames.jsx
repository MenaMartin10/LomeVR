import { useEffect } from 'react';
import { GAMES } from '../lib/constants';

export default function IncludedGames() {
  useEffect(() => {
    console.log('[Juegos] Render de grilla con', GAMES.length, 'juegos');
  }, []);

  return (
    <section id="juegos" aria-label="Juegos incluidos">
      <h3 data-aos="slide-right">Juegos incluidos</h3>
      <div className="games-grid">
        {GAMES.map((g, i) => (
          <article key={g.key} className="game-card" data-aos="zoom-in">
            <figure className="game-figure">
              <img
                src={g.img}
                alt={g.alt}
                loading="lazy"
                onLoad={() => console.log(`[Juegos] Cargó imagen ${i + 1}/${GAMES.length}:`, g.name)}
              />
            </figure>
            <h5>{g.name}</h5>
            <p>{g.desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}