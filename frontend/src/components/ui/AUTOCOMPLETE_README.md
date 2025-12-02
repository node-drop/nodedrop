# AutoComplete Component

A generic, flexible autocomplete component with search, preload, and customization capabilities.

## Features

- ✨ **Generic**: Works with any data type
- 🔍 **Searchable**: Built-in search with custom filter functions
- 🚀 **Preload**: Load data on mount or on focus
- ⚡ **Async**: Support for async data fetching and searching
- 🎨 **Customizable**: Custom rendering for options and selected items
- ♻️ **Refreshable**: Manual refresh button for data reloading
- 🧹 **Clearable**: Clear selection with ease
- 💪 **TypeScript**: Full TypeScript support with generics

## Basic Usage

```tsx
import { AutoComplete, AutoCompleteOption } from "@/components/ui/autocomplete";

const options: AutoCompleteOption[] = [
  { id: "1", label: "Option 1", value: "option1" },
  { id: "2", label: "Option 2", value: "option2" },
  { id: "3", label: "Option 3", value: "option3" },
];

function MyComponent() {
  const [value, setValue] = useState("");

  return (
    <AutoComplete
      value={value}
      onChange={(newValue) => setValue(newValue)}
      options={options}
      placeholder="Select an option..."
    />
  );
}
```

## With Async Data Fetching

```tsx
const fetchUsers = async (): Promise<AutoCompleteOption<User>[]> => {
  const response = await fetch("/api/users");
  const users = await response.json();

  return users.map((user: User) => ({
    id: user.id,
    label: user.name,
    value: user,
    metadata: {
      subtitle: user.email,
      avatar: user.avatar,
    },
  }));
};

<AutoComplete
  value={userId}
  onChange={(id) => setUserId(id)}
  onFetch={fetchUsers}
  preloadOnMount={true}
  icon={<UserIcon />}
/>;
```

## With Search API

```tsx
const searchProducts = async (
  query: string
): Promise<AutoCompleteOption<Product>[]> => {
  const response = await fetch(`/api/products/search?q=${query}`);
  const products = await response.json();

  return products.map((product: Product) => ({
    id: product.id,
    label: product.name,
    value: product,
    metadata: {
      subtitle: `$${product.price}`,
      inStock: product.inStock,
    },
  }));
};

<AutoComplete
  value={productId}
  onChange={(id) => setProductId(id)}
  onSearch={searchProducts}
  searchPlaceholder="Search products..."
  preloadOnFocus={true}
/>;
```

## Custom Rendering

```tsx
<AutoComplete
  value={value}
  onChange={setValue}
  options={options}
  renderOption={(option) => (
    <div className="flex items-center gap-3">
      <img src={option.metadata?.avatar} className="w-8 h-8 rounded-full" />
      <div>
        <p className="font-medium">{option.label}</p>
        <p className="text-xs text-muted-foreground">
          {option.metadata?.email}
        </p>
      </div>
      {option.metadata?.isOnline && (
        <span className="ml-auto w-2 h-2 bg-green-500 rounded-full" />
      )}
    </div>
  )}
  renderSelected={(option) => (
    <div className="flex items-center gap-2">
      <img src={option.metadata?.avatar} className="w-6 h-6 rounded-full" />
      <span>{option.label}</span>
    </div>
  )}
/>
```

## Props

### Core Props

| Prop       | Type                                                   | Default | Description                     |
| ---------- | ------------------------------------------------------ | ------- | ------------------------------- |
| `value`    | `string`                                               | -       | The selected value (id)         |
| `onChange` | `(value: string, option?: AutoCompleteOption) => void` | -       | Callback when selection changes |

### Data Props

| Prop       | Type                                               | Default | Description                      |
| ---------- | -------------------------------------------------- | ------- | -------------------------------- |
| `options`  | `AutoCompleteOption[]`                             | `[]`    | Static list of options           |
| `onFetch`  | `() => Promise<AutoCompleteOption[]>`              | -       | Async function to fetch options  |
| `onSearch` | `(query: string) => Promise<AutoCompleteOption[]>` | -       | Async function to search options |

### Behavior Props

| Prop             | Type      | Default | Description                      |
| ---------------- | --------- | ------- | -------------------------------- |
| `preloadOnMount` | `boolean` | `false` | Fetch data when component mounts |
| `preloadOnFocus` | `boolean` | `false` | Fetch data when input is focused |
| `clearable`      | `boolean` | `true`  | Show clear/change button         |
| `refreshable`    | `boolean` | `true`  | Show refresh button              |
| `searchable`     | `boolean` | `true`  | Enable search functionality      |
| `disabled`       | `boolean` | `false` | Disable the component            |
| `loading`        | `boolean` | `false` | External loading state           |

### UI Props

| Prop                | Type              | Default                  | Description                        |
| ------------------- | ----------------- | ------------------------ | ---------------------------------- |
| `placeholder`       | `string`          | `"Select an option..."`  | Placeholder for input              |
| `searchPlaceholder` | `string`          | `"Search..."`            | Placeholder when searching         |
| `emptyMessage`      | `string`          | `"No options available"` | Message when no options            |
| `errorMessage`      | `string`          | -                        | Error message to display           |
| `noOptionsMessage`  | `string`          | `"No results found"`     | Message when search has no results |
| `icon`              | `React.ReactNode` | -                        | Icon to display with options       |
| `maxHeight`         | `number`          | `300`                    | Max height of dropdown (px)        |
| `className`         | `string`          | -                        | Container class name               |
| `inputClassName`    | `string`          | -                        | Input class name                   |

### Custom Rendering Props

| Prop             | Type                                                          | Description                             |
| ---------------- | ------------------------------------------------------------- | --------------------------------------- |
| `renderOption`   | `(option: AutoCompleteOption) => ReactNode`                   | Custom render for dropdown options      |
| `renderSelected` | `(option: AutoCompleteOption) => ReactNode`                   | Custom render for selected value        |
| `filterFn`       | `(option: AutoCompleteOption, searchTerm: string) => boolean` | Custom filter function for local search |

## AutoCompleteOption Interface

```typescript
interface AutoCompleteOption<T = any> {
  id: string; // Unique identifier
  label: string; // Display text
  value: T; // The actual value (any type)
  metadata?: Record<string, any>; // Additional data for custom rendering
}
```

## Examples

### Real-World Example: Google Sheets Selector

```tsx
import { AutoComplete, AutoCompleteOption } from "@/components/ui/autocomplete";
import { Sheet } from "lucide-react";

interface Spreadsheet {
  id: string;
  name: string;
  modifiedTime?: string;
}

export function SpreadsheetSelector({ credentialId, value, onChange }) {
  const fetchSpreadsheets = async (): Promise<
    AutoCompleteOption<Spreadsheet>[]
  > => {
    if (!credentialId) {
      throw new Error("Please select credentials first");
    }

    const response = await fetch(
      `/api/google/spreadsheets?credentialId=${credentialId}`
    );

    if (!response.ok) {
      throw new Error("Failed to load spreadsheets");
    }

    const result = await response.json();
    const spreadsheets = result.data.spreadsheets || [];

    return spreadsheets.map((s: Spreadsheet) => ({
      id: s.id,
      label: s.name,
      value: s,
      metadata: {
        subtitle: s.modifiedTime
          ? `Modified: ${new Date(s.modifiedTime).toLocaleDateString()}`
          : undefined,
      },
    }));
  };

  return (
    <AutoComplete<Spreadsheet>
      value={value}
      onChange={onChange}
      onFetch={fetchSpreadsheets}
      preloadOnMount={!!credentialId}
      icon={<Sheet className="w-4 h-4 text-green-600" />}
      placeholder="Select a spreadsheet..."
      searchPlaceholder="Search spreadsheets..."
      emptyMessage="No spreadsheets available"
      disabled={!credentialId}
    />
  );
}
```

### Example: Country Selector with Flags

```tsx
const countries: AutoCompleteOption[] = [
  {
    id: "us",
    label: "United States",
    value: "US",
    metadata: { flag: "🇺🇸", code: "+1" },
  },
  {
    id: "uk",
    label: "United Kingdom",
    value: "GB",
    metadata: { flag: "🇬🇧", code: "+44" },
  },
  // ... more countries
];

<AutoComplete
  value={country}
  onChange={setCountry}
  options={countries}
  renderOption={(option) => (
    <div className="flex items-center gap-2">
      <span className="text-2xl">{option.metadata?.flag}</span>
      <span>{option.label}</span>
      <span className="text-muted-foreground ml-auto">
        {option.metadata?.code}
      </span>
    </div>
  )}
  renderSelected={(option) => (
    <div className="flex items-center gap-2">
      <span>{option.metadata?.flag}</span>
      <span>{option.label}</span>
    </div>
  )}
/>;
```

### Example: User Selector with Avatar

```tsx
const searchUsers = async (query: string) => {
  const response = await fetch(`/api/users/search?q=${query}`);
  const users = await response.json();

  return users.map((user) => ({
    id: user.id,
    label: user.name,
    value: user,
    metadata: {
      email: user.email,
      avatar: user.avatar,
      role: user.role,
    },
  }));
};

<AutoComplete
  value={assignee}
  onChange={setAssignee}
  onSearch={searchUsers}
  renderOption={(option) => (
    <div className="flex items-center gap-3">
      <img
        src={option.metadata?.avatar}
        className="w-8 h-8 rounded-full"
        alt={option.label}
      />
      <div className="flex-1">
        <p className="font-medium">{option.label}</p>
        <p className="text-xs text-muted-foreground">
          {option.metadata?.email}
        </p>
      </div>
      <span className="text-xs px-2 py-1 bg-gray-100 rounded">
        {option.metadata?.role}
      </span>
    </div>
  )}
/>;
```

## Tips

1. **Use TypeScript Generics**: Type your data for better autocomplete

   ```tsx
   <AutoComplete<User> ... />
   ```

2. **Preload Strategically**: Use `preloadOnMount` for small datasets, `preloadOnFocus` for larger ones

3. **Custom Filters**: Provide your own `filterFn` for advanced filtering

   ```tsx
   filterFn={(option, term) => {
     return option.label.includes(term) ||
            option.metadata?.tags?.some(tag => tag.includes(term));
   }}
   ```

4. **Error Handling**: The component automatically catches and displays errors from `onFetch` and `onSearch`

5. **Accessibility**: The component uses semantic HTML and is keyboard navigable

## Migration from SpreadsheetSelector

The old `SpreadsheetSelector` has been refactored to use `AutoComplete`. To migrate similar components:

**Before:**

```tsx
// Custom component with lots of state management
const [items, setItems] = useState([]);
const [loading, setLoading] = useState(false);
const [searchTerm, setSearchTerm] = useState("");
// ... lots of code
```

**After:**

```tsx
const fetchItems = async () => {
  const response = await fetch("/api/items");
  const data = await response.json();
  return data.map((item) => ({ id: item.id, label: item.name, value: item }));
};

<AutoComplete onFetch={fetchItems} preloadOnMount />;
```
