Main site/app header; use at the top of every desktop view.

```jsx
<PrimaryNav links={[{ id: 'learn', label: 'Learn' }, { id: 'songs', label: 'Songs' }]} active="songs"
  right={<><SearchPill /><IconButton icon="user" label="Profile" variant="ghost" /></>} />
```

- Active link: 2px ink bottom line, never a fill. Wordmark is plain type (no logo supplied).
