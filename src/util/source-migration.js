const migrations = [
  {
    name: 'mangafox_to_fanfox',
    description: 'Mangafox domain was renamed to fanfox.net',
    version: '0.5.2',
    changes: [
      {
        type: 'replace',
        key: 'url',
        oldValue: 'mangafox.la',
        newValue: 'fanfox.net',
      },
      {
        type: 'replace',
        key: 'source',
        oldValue: 'mangafox',
        newValue: 'fanfox',
      },
    ],
  },
];

export default migrations;
