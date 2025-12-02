# AutoComplete Quick Start Guide

## Installation

The AutoComplete component is already installed in your UI components library at:

```
frontend/src/components/ui/autocomplete.tsx
```

## Basic Usage (30 seconds)

```tsx
import { AutoComplete } from "@/components/ui/autocomplete";

function MyComponent() {
  const [value, setValue] = useState("");

  return (
    <AutoComplete
      value={value}
      onChange={setValue}
      options={[
        { id: "1", label: "Option 1", value: "opt1" },
        { id: "2", label: "Option 2", value: "opt2" },
      ]}
    />
  );
}
```

## With API Data (1 minute)

```tsx
const fetchOptions = async () => {
  const response = await fetch("/api/items");
  const data = await response.json();

  return data.map((item) => ({
    id: item.id,
    label: item.name,
    value: item,
  }));
};

<AutoComplete
  value={itemId}
  onChange={setItemId}
  onFetch={fetchOptions}
  preloadOnMount
/>;
```

## With Search (1 minute)

```tsx
const searchOptions = async (query) => {
  const response = await fetch(`/api/search?q=${query}`);
  const data = await response.json();

  return data.map((item) => ({
    id: item.id,
    label: item.name,
    value: item,
  }));
};

<AutoComplete value={itemId} onChange={setItemId} onSearch={searchOptions} />;
```

## Most Common Props

| Prop             | When to Use                  |
| ---------------- | ---------------------------- |
| `options`        | Static list of options       |
| `onFetch`        | Load data from API once      |
| `onSearch`       | Search API on each keystroke |
| `preloadOnMount` | Load data immediately        |
| `preloadOnFocus` | Load data when user clicks   |
| `icon`           | Add an icon to options       |
| `disabled`       | Disable the component        |
| `error`          | Show error message           |

## Common Patterns

### Google Sheets Style

```tsx
<AutoComplete
  onFetch={fetchSheets}
  preloadOnMount={!!credentialId}
  icon={<Sheet className="w-4 h-4" />}
  disabled={!credentialId}
/>
```

### User Search Style

```tsx
<AutoComplete
  onSearch={searchUsers}
  preloadOnFocus
  icon={<User className="w-4 h-4" />}
  renderOption={(opt) => (
    <div className="flex items-center gap-2">
      <img src={opt.metadata?.avatar} className="w-8 h-8 rounded-full" />
      <div>
        <p>{opt.label}</p>
        <p className="text-xs text-muted-foreground">{opt.metadata?.email}</p>
      </div>
    </div>
  )}
/>
```

### Database Style

```tsx
<AutoComplete
  onFetch={fetchTables}
  preloadOnMount={!!connectionId}
  icon={<Database className="w-4 h-4" />}
  emptyMessage="Select a connection first"
  disabled={!connectionId}
/>
```

## Need More Help?

- 📖 Full docs: `frontend/src/components/ui/AUTOCOMPLETE_README.md`
- 💡 Examples: `frontend/src/components/ui/autocomplete-examples.tsx`
- 🔍 Reference: `frontend/src/components/workflow/node-config/custom-fields/SpreadsheetSelector.tsx`

## Tips

1. **Use TypeScript**: `<AutoComplete<User> ... />` for type safety
2. **Preload smart**: Use `preloadOnMount` for small data, `preloadOnFocus` for large
3. **Custom icons**: Use `lucide-react` icons for consistency
4. **Error handling**: Component handles errors from async functions automatically
5. **Metadata**: Use `metadata` field for extra data in custom rendering

## 3 Most Common Mistakes

1. ❌ **Forgetting to transform data**

   ```tsx
   // Wrong
   return data; // Raw API data

   // Right
   return data.map((item) => ({
     id: item.id,
     label: item.name,
     value: item,
   }));
   ```

2. ❌ **Not handling dependencies**

   ```tsx
   // Wrong
   preloadOnMount={true} // Always loads

   // Right
   preloadOnMount={!!credentialId} // Only when ready
   ```

3. ❌ **Missing error handling**

   ```tsx
   // Wrong
   const fetch = async () => {
     const res = await fetch("/api");
     return res.json(); // May fail silently
   };

   // Right
   const fetch = async () => {
     const res = await fetch("/api");
     if (!res.ok) throw new Error("Failed to load");
     return res.json();
   };
   ```

## Done!

You're ready to use AutoComplete. Check the full documentation for advanced features like custom rendering, filters, and more.
