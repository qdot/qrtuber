import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'QRTuber',
  tagline: 'Transfering data through video, a few bytes at a time.',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://qrtuber.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'qdot', // Usually your GitHub org/user name.
  projectName: 'qrtuber', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/logo-social-card.png',
    navbar: {
      title: 'QRTuber',
      logo: {
        alt: 'QRTuber',
        src: 'img/logo.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: '/demo/',
          position: 'left',
          label: 'Demo',
        },
        {
          href: '/extension/',
          position: 'left',
          label: 'Browser Extension',
        },
        /*
        {to: '/blog', label: 'Blog', position: 'left'},
        */
        {
          href: 'https://github.com/qdot/qrtuber',
          label: 'GitHub',
          position: 'right',
        },

      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Documentation',
              to: '/docs/',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Discord',
              href: 'https://discord.gg/NsCeMNxk',
            },
            {
              label: 'Twitch',
              href: 'https://twitch.tv/qdotfm',
            },
          ],
        },
        {
          title: 'More',
          items: [
            /*
            {
              label: 'Blog',
              to: '/blog',
            },
            */
            {
              label: 'GitHub',
              href: 'https://github.com/qdot/qrtuber',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Nonpolynomial Labs, LLC. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
