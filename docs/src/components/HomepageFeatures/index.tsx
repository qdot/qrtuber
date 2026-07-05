import Heading from '@theme/Heading';
import type {ReactElement, ReactNode} from 'react';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  icon: ReactNode;
  description: ReactNode;
};

function PixelIcon({d}: {d: string}): ReactElement {
  return (
    <svg
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className={styles.featureGlyph}>
      <path fill="currentColor" d={d} />
    </svg>
  );
}

const FeatureList: FeatureItem[] = [
  {
    title: 'One browser source',
    icon: (
      <PixelIcon d="M1 1h14v1H1zM1 2h1v9H1zM14 2h1v9h-1zM1 10h14v1H1zM7 11h2v2H7zM5 13h6v1H5zM4 4h2v2H4zM10 4h2v2h-2zM4 7h2v2H4zM8 7h1v1H8zM10 8h1v1h-1z" />
    ),
    description: (
      <>
        Streamers add a single OBS browser source. Viewers grab the browser
        extension, or use WebRTC screen capture if they don&apos;t want to
        install anything at all.
      </>
    ),
  },
  {
    title: '100% web tech',
    icon: (
      <PixelIcon d="M5 4h1v1H5zM4 5h1v1H4zM3 6h1v1H3zM2 7h1v2H2zM3 9h1v1H3zM4 10h1v1H4zM5 11h1v1H5zM10 4h1v1h-1zM11 5h1v1h-1zM12 6h1v1h-1zM13 7h1v2h-1zM12 9h1v1h-1zM11 10h1v1h-1zM10 11h1v1h-1zM9 3h1v2H9zM8 5h1v2H8zM7 7h1v2H7zM6 9h1v2H6z" />
    ),
    description: (
      <>
        WASM, WebRTC, Canvas, and Service Workers. Nothing to download,
        nothing to update. If you have a browser, you have QRTuber.
      </>
    ),
  },
  {
    title: 'Small payloads, big experiences',
    icon: (
      <PixelIcon d="M6 6h4v4H6zM4 7h1v2H4zM2 6h1v4H2zM11 7h1v2h-1zM13 6h1v4h-1zM7 4h2v1H7zM7 11h2v1H7z" />
    ),
    description: (
      <>
        Send any data the extension format supports, at 10–20 Hz. It&apos;s a
        QR code on a potato, not a fibre line — and for syncing haptics to a
        stream, that&apos;s plenty.
      </>
    ),
  },
];

function Feature({title, icon, description}: FeatureItem) {
  return (
    <div className="col col--4">
      <div className={styles.feature}>
        <div className={styles.featureIcon}>{icon}</div>
        <Heading as="h3" className={styles.featureTitle}>
          {title}
        </Heading>
        <p className={styles.featureBody}>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactElement {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
