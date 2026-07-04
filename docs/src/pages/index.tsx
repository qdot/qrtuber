import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import HowItWorks from '@site/src/components/HowItWorks';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';
import type {ReactElement} from 'react';

import styles from './index.module.css';

function HomepageHero(): ReactElement {
  return (
    <header className={styles.hero}>
      <div className={clsx('container', styles.heroInner)}>
        <div>
          <p className={styles.heroEyebrow}>Streamer → viewer data transfer</p>
          <Heading as="h1" className={styles.heroTitle}>
            Stream data. Through a potato.
          </Heading>
          <p className={styles.heroSubtitle}>
            QRTuber syncs your viewers&apos; devices to your stream with a
            constantly-updating QR code overlay. A few bytes at a time. No
            servers, no SDKs, no cost, no guarantees.
          </p>
          <div className={styles.heroButtons}>
            <Link
              className={clsx(
                'button button--primary button--lg',
                styles.ctaButton,
              )}
              to="/docs/">
              Get Started
            </Link>
            <Link
              className={clsx(
                'button button--outline button--primary button--lg',
                styles.ctaButton,
              )}
              to="/demo/">
              Try the Demo
            </Link>
          </div>
        </div>
        <div className={styles.heroArt}>
          <img
            src={require('@site/static/img/qtato-code-hero.png').default}
            alt="The qtato: an illustrated russet potato with a QR code printed on its skin"
            width={1280}
            height={960}
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
          <div className={styles.scanline} aria-hidden="true" />
        </div>
      </div>
    </header>
  );
}

function StatusBand(): ReactElement {
  return (
    <section className={styles.statusBand}>
      <div className="container">
        <p className={styles.statusText}>
          <strong>Pre-alpha proof of concept.</strong> The only integration
          today relays events to{' '}
          <Link to="https://intiface.com/central">Intiface Central</Link> for
          haptics sync. Expect rough edges, breaking changes, and the
          occasional missed frame. It&apos;s a potato.
        </p>
      </div>
    </section>
  );
}

export default function Home(): ReactElement {
  return (
    <Layout
      title="QRTuber"
      description="QRTuber syncs viewers' devices to live streams through a QR code overlay — streamer-to-viewer data transfer built entirely on web tech.">
      <HomepageHero />
      <main>
        <HowItWorks />
        <HomepageFeatures />
        <StatusBand />
      </main>
    </Layout>
  );
}
