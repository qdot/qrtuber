import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  png: any;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Easy to Use',
    png: require('@site/static/img/undraw_docusaurus_mountain.png').default,
    description: (
      <>
        For streamers, a simple OBS Browser Component does what you need. Web 
        Browser Extensions make life simple for users. There's even WebRTC for
        those that want a no-install solution!
      </>
    ),
  },
  {
    title: '100% Web Tech',
    png: require('@site/static/img/undraw_docusaurus_tree.png').default,
    description: (
      <>
        Built on 100% web technologies, using WASM, WebRTC, Video, Canvas,
        and Service Workers. No need for installs other than a browser!
      </>
    ),
  },
  {
    title: 'Extensible Communication',
    png: require('@site/static/img/undraw_docusaurus_react.png').default,
    description: (
      <>
        Send any type of data, as long as it's supposed by our extension format
        and there's not too much of it and it doesn't really need to update at 
        more than 10-20hz!
      </>
    ),
  },
];

function Feature({title, png, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <div className={styles.featureSvg}>
          <img role="img" src={png} />
        </div>
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
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
