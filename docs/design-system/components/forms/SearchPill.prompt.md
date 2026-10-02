Search input pill; use in the primary nav right cluster and atop song libraries.

```jsx
<SearchPill placeholder="Search songs" onSubmit={q => setQuery(q)} />
```

- 40px tall, 24px radius, magnifier left. Focus: white + 2px ink border + 12px soft-cloud halo (the only focus ring).
- The only documented form field — checkout/sign-up fields are not specified in the source.
