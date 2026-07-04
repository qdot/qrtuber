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
      'A game event, a tip, a chat command, whatever your source program ' +
      'wants viewers to experience.',
  },
  {
    title: 'Bytes become a QR code',
    description:
      'The event is packed into a tiny payload (an identifier ' +
      'plus a few bytes of data) and rendered as a QR code.',
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
      'A browser extension (coming soon), userscript (also coming soon), or WebRTC screen capture reads the ' +
      'code straight off the pixels, between 5-20 times a second (customizable).',
  },
  {
    title: 'Devices react',
    description:
      'Decoded events relay to programs like Intiface Central. Haptics ' +
      'buzz, lights flash, gamepads rumble, in sync with the stream.',
  },
  {
    title: 'Stored with the video',
    description:
      'The QRCode is composited into the video stream at broadcast, meaning ' +
      'viewers watching VODs still get all the effects.',
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
