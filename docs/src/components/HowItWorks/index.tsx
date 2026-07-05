import {useState} from 'react';
import Heading from '@theme/Heading';
import type {ReactElement} from 'react';
import styles from './styles.module.css';

const EXPLAINER_VIDEO_ID = 'vGbTqno3HEY';

type Step = {
  title: string;
  description: string;
  detail: string;
};

const Steps: Step[] = [
  {
    title: 'Something happens',
    description:
      'A game event, a tip, a chat command — anything a program on your ' +
      'computer can watch.',
    detail:
      'The event is packed into a tiny payload (an identifier plus a few ' +
      'bytes of data) and rendered as a QR code.',
  },
  {
    title: 'A code appears on your stream',
    description:
      'A small QR code rides in the corner of your video, updating as ' +
      'events happen.',
    detail:
      'A single OBS browser source overlays it — that is the entire ' +
      'transport layer. The code is part of the video itself, so viewers ' +
      'watching VODs still get all the effects.',
  },
  {
    title: "Your viewers' stuff reacts",
    description:
      'Haptics buzz, lights flash, gamepads rumble — in sync with your ' +
      'stream, on their desks.',
    detail:
      'The browser extension or web viewer reads the code straight off the ' +
      'pixels, 5-20 times a second, and relays events to programs like ' +
      'Intiface Central.',
  },
];

function ExplainerVideo(): ReactElement {
  const [playing, setPlaying] = useState(false);
  return (
    <figure className={styles.video}>
      {playing ? (
        <iframe
          className={styles.videoFrame}
          src={`https://www.youtube-nocookie.com/embed/${EXPLAINER_VIDEO_ID}?autoplay=1`}
          title="QRTuber explainer video"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          className={styles.videoPoster}
          onClick={() => setPlaying(true)}
          aria-label="Play the QRTuber explainer video">
          <img
            src={`https://i.ytimg.com/vi/${EXPLAINER_VIDEO_ID}/maxresdefault.jpg`}
            alt=""
            loading="lazy"
            width={1280}
            height={720}
          />
          <span className={styles.videoPlayIcon} aria-hidden="true" />
        </button>
      )}
      <figcaption className={styles.videoCaption}>
        For those who hate reading, here's a video intro.
      </figcaption>
    </figure>
  );
}

export default function HowItWorks(): ReactElement {
  return (
    <section className={styles.howItWorks}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>
          How it works
        </Heading>
        <div className={styles.layout}>
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
                  <p className={styles.stepDetail}>{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
          <ExplainerVideo />
        </div>
      </div>
    </section>
  );
}
