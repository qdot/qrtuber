import Heading from '@theme/Heading';
import type {ReactElement} from 'react';
import styles from './styles.module.css';

type Step = {
  title: string;
  description: string;
};

const Steps: Step[] = [
  {
    title: 'Something happens',
    description:
      'A game event, a tip, a chat command — whatever your source program ' +
      'wants viewers to feel.',
  },
  {
    title: 'Bytes become a QR code',
    description:
      'The event is packed into a tiny payload — a 16-bit format identifier ' +
      'plus a few bytes of data — and rendered as a QR code.',
  },
  {
    title: 'The code rides your stream',
    description:
      'A single OBS browser source overlays it on your stream. That is the ' +
      'entire transport layer.',
  },
  {
    title: 'Viewers decode it off the video',
    description:
      'A browser extension, userscript, or WebRTC screen capture reads the ' +
      'code straight off the pixels, around 20 times a second.',
  },
  {
    title: 'Devices react',
    description:
      'Decoded events relay to programs like Intiface Central — haptics ' +
      'buzz, lights flash, gamepads rumble, in sync with the stream.',
  },
];

export default function HowItWorks(): ReactElement {
  return (
    <section className={styles.howItWorks}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>
          How it works
        </Heading>
        <ol className={styles.steps}>
          {Steps.map((step, idx) => (
            <li key={idx} className={styles.step}>
              <span className={styles.stepIndex} aria-hidden="true">
                {String(idx + 1).padStart(2, '0')}
              </span>
              <div>
                <Heading as="h3" className={styles.stepTitle}>
                  {step.title}
                </Heading>
                <p className={styles.stepBody}>{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
