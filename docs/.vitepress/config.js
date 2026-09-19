export default {
  title: 'Aegis.js',
  description: 'Silicon-Speed Zero-GC Flat Memory Arenas for JavaScript and Node.js',
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#0ea5e9' }],
  ],
  themeConfig: {
    siteTitle: 'Aegis.js',
    logo: '/logo.svg',
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Architecture', link: '/guide/zero-gc-architecture' },
      { text: 'API Reference', link: '/api/reference' },
      { text: 'Benchmarks', link: '/benchmarks/' },
      { text: 'GitHub', link: 'https://github.com/aventine-labs/aegis-js' },
    ],
    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'What is Aegis.js?', link: '/guide/what-is-aegis' },
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Zero-GC Architecture', link: '/guide/zero-gc-architecture' },
        ],
      },
      {
        text: 'Core Concepts',
        items: [
          { text: 'Primitives & Structs', link: '/guide/structs-and-primitives' },
          { text: 'The Flyweight Cursor', link: '/guide/flyweight-cursor' },
          { text: '64-Byte Cache Alignment', link: '/guide/cache-alignment' },
        ],
      },
      {
        text: 'Collections',
        items: [
          { text: 'AegisList (Contiguous Array)', link: '/guide/collections-list' },
          { text: 'AegisRingBuffer (FIFO Queue)', link: '/guide/collections-ring-buffer' },
          { text: 'AegisMap (Flat Hash Table)', link: '/guide/collections-map' },
          { text: 'AegisPool (Object Pool)', link: '/guide/collections-pool' },
        ],
      },
      {
        text: 'Concurrency & I/O',
        items: [
          { text: 'SharedArrayBuffer & Workers', link: '/guide/threads-and-workers' },
          { text: 'Binary Serialization & Streaming', link: '/guide/binary-io' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'Complete API Reference', link: '/api/reference' },
          { text: 'Performance Benchmarks', link: '/benchmarks/' },
        ],
      },
    ],
    footer: {
      message: 'Released under the Apache 2.0 License. Built for sovereign silicon performance.',
      copyright: 'Copyright (c) 2026 Aventine Labs LLC. All rights reserved.',
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/aventine-labs/aegis-js' },
    ],
  },
};
