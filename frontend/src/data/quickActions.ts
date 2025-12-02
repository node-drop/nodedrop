/**
 * Quick Actions Menu - Slash commands and templates
 */

export interface QuickAction {
  trigger: string;
  label: string;
  icon: string;
  description: string;
  insert?: string;
  placeholders?: string[]; // Tab stops for multi-field templates
  example?: string;
  children?: QuickAction[];
  action?: "showVariables" | "showFunctions" | "showTemplates";
}

export const quickActions: QuickAction[] = [
  // Date & Time
  {
    trigger: "/date",
    label: "Date & Time",
    icon: "📅",
    description: "Insert date and time functions",
    children: [
      {
        trigger: "/date/now",
        label: "Current timestamp",
        icon: "🕐",
        description: "Insert current date and time",
        insert: "{{$now}}",
        example: "2025-10-13T12:30:45.000Z",
      },
      {
        trigger: "/date/today",
        label: "Today's date",
        icon: "📆",
        description: "Insert today's date",
        insert: "{{$today}}",
        example: "2025-10-13",
      },
      {
        trigger: "/date/format",
        label: "Format date",
        icon: "🎨",
        description: "Format date with custom pattern",
        insert: '{{$now.format("YYYY-MM-DD")}}',
        placeholders: ["YYYY-MM-DD"],
        example: "2025-10-13",
      },
      {
        trigger: "/date/add",
        label: "Add time",
        icon: "➕",
        description: "Add time to date",
        insert: "{{$now.plus({days: 1})}}",
        placeholders: ["days", "1"],
        example: "Add 1 day to current date",
      },
      {
        trigger: "/date/subtract",
        label: "Subtract time",
        icon: "➖",
        description: "Subtract time from date",
        insert: "{{$now.minus({hours: 2})}}",
        placeholders: ["hours", "2"],
        example: "Subtract 2 hours from current date",
      },
    ],
  },

  // Conditionals
  {
    trigger: "/if",
    label: "If/Else",
    icon: "⚡",
    description: "Insert conditional expression",
    insert: '{{condition ? "yes" : "no"}}',
    placeholders: ["condition", "yes", "no"],
    example: '{{json.active ? "Active" : "Inactive"}}',
  },

  // Variables
  {
    trigger: "/var",
    label: "Variables",
    icon: "📦",
    description: "Browse and insert variables",
    children: [
      {
        trigger: "/var/local",
        label: "Local variable",
        icon: "📍",
        description: "Insert workflow-local variable",
        insert: "{{$local.variableName}}",
        placeholders: ["variableName"],
        example: "{{$local.apiUrl}}",
      },
      {
        trigger: "/var/global",
        label: "Global variable",
        icon: "🌍",
        description: "Insert global variable",
        insert: "{{$vars.variableName}}",
        placeholders: ["variableName"],
        example: "{{$vars.apiKey}}",
      },
    ],
  },

  // Array Operations
  {
    trigger: "/arr",
    label: "Array Operations",
    icon: "📊",
    description: "Array manipulation functions",
    children: [
      {
        trigger: "/arr/map",
        label: "Map array",
        icon: "🗺️",
        description: "Transform array items",
        insert: "{{array.map(item => item.property)}}",
        placeholders: ["array", "item", "property"],
        example: "{{json.users.map(user => user.email)}}",
      },
      {
        trigger: "/arr/filter",
        label: "Filter array",
        icon: "🔍",
        description: "Filter array items",
        insert: "{{array.filter(item => item.active)}}",
        placeholders: ["array", "item", "active"],
        example: "{{json.users.filter(user => user.active)}}",
      },
      {
        trigger: "/arr/find",
        label: "Find item",
        icon: "🎯",
        description: "Find first matching item",
        insert: "{{array.find(item => item.id === value)}}",
        placeholders: ["array", "item", "id", "value"],
        example: "{{json.users.find(user => user.id === 123)}}",
      },
      {
        trigger: "/arr/reduce",
        label: "Reduce array",
        icon: "⬇️",
        description: "Reduce array to single value",
        insert: "{{array.reduce((sum, item) => sum + item.value, 0)}}",
        placeholders: ["array", "sum", "item", "value", "0"],
        example:
          "{{json.items.reduce((total, item) => total + item.price, 0)}}",
      },
      {
        trigger: "/arr/sort",
        label: "Sort array",
        icon: "🔃",
        description: "Sort array items",
        insert: "{{array.sort((a, b) => a.value - b.value)}}",
        placeholders: ["array", "a", "b", "value"],
        example: "{{json.items.sort((a, b) => a.price - b.price)}}",
      },
      {
        trigger: "/arr/length",
        label: "Array length",
        icon: "📏",
        description: "Get array length",
        insert: "{{array.length}}",
        placeholders: ["array"],
        example: "{{json.users.length}}",
      },
      {
        trigger: "/arr/join",
        label: "Join array",
        icon: "🔗",
        description: "Join array items to string",
        insert: '{{array.join(", ")}}',
        placeholders: ["array", ", "],
        example: '{{json.tags.join(", ")}}',
      },
      {
        trigger: "/arr/first",
        label: "First item",
        icon: "1️⃣",
        description: "Get first array item",
        insert: "{{array[0]}}",
        placeholders: ["array"],
        example: "{{json.users[0]}}",
      },
      {
        trigger: "/arr/last",
        label: "Last item",
        icon: "🔚",
        description: "Get last array item",
        insert: "{{array[array.length - 1]}}",
        placeholders: ["array"],
        example: "{{json.users[json.users.length - 1]}}",
      },
    ],
  },

  // String Functions
  {
    trigger: "/str",
    label: "String Functions",
    icon: "📝",
    description: "String manipulation functions",
    children: [
      {
        trigger: "/str/upper",
        label: "Uppercase",
        icon: "🔠",
        description: "Convert to uppercase",
        insert: "{{text.toUpperCase()}}",
        placeholders: ["text"],
        example: "{{json.name.toUpperCase()}}",
      },
      {
        trigger: "/str/lower",
        label: "Lowercase",
        icon: "🔡",
        description: "Convert to lowercase",
        insert: "{{text.toLowerCase()}}",
        placeholders: ["text"],
        example: "{{json.email.toLowerCase()}}",
      },
      {
        trigger: "/str/trim",
        label: "Trim",
        icon: "✂️",
        description: "Remove whitespace",
        insert: "{{text.trim()}}",
        placeholders: ["text"],
        example: "{{json.name.trim()}}",
      },
      {
        trigger: "/str/replace",
        label: "Replace",
        icon: "🔄",
        description: "Replace text",
        insert: '{{text.replace("old", "new")}}',
        placeholders: ["text", "old", "new"],
        example: '{{json.text.replace("hello", "hi")}}',
      },
      {
        trigger: "/str/split",
        label: "Split",
        icon: "✂️",
        description: "Split string to array",
        insert: '{{text.split(",")}}',
        placeholders: ["text", ","],
        example: '{{json.tags.split(",")}}',
      },
      {
        trigger: "/str/concat",
        label: "Concatenate",
        icon: "➕",
        description: "Concatenate strings",
        insert: '{{string1 + " " + string2}}',
        placeholders: ["string1", " ", "string2"],
        example: '{{json.firstName + " " + json.lastName}}',
      },
      {
        trigger: "/str/substring",
        label: "Substring",
        icon: "🔤",
        description: "Extract substring",
        insert: "{{text.substring(0, 10)}}",
        placeholders: ["text", "0", "10"],
        example: "{{json.description.substring(0, 100)}}",
      },
      {
        trigger: "/str/length",
        label: "String length",
        icon: "📏",
        description: "Get string length",
        insert: "{{text.length}}",
        placeholders: ["text"],
        example: "{{json.message.length}}",
      },
      {
        trigger: "/str/includes",
        label: "Contains",
        icon: "🔍",
        description: "Check if string contains text",
        insert: '{{text.includes("search")}}',
        placeholders: ["text", "search"],
        example: '{{json.email.includes("@gmail.com")}}',
      },
    ],
  },

  // Math Operations
  {
    trigger: "/math",
    label: "Math Operations",
    icon: "🔢",
    description: "Mathematical functions",
    children: [
      {
        trigger: "/math/round",
        label: "Round",
        icon: "⭕",
        description: "Round to nearest integer",
        insert: "{{Math.round(number)}}",
        placeholders: ["number"],
        example: "{{Math.round(json.price)}}",
      },
      {
        trigger: "/math/floor",
        label: "Floor",
        icon: "⬇️",
        description: "Round down",
        insert: "{{Math.floor(number)}}",
        placeholders: ["number"],
        example: "{{Math.floor(json.value)}}",
      },
      {
        trigger: "/math/ceil",
        label: "Ceiling",
        icon: "⬆️",
        description: "Round up",
        insert: "{{Math.ceil(number)}}",
        placeholders: ["number"],
        example: "{{Math.ceil(json.score)}}",
      },
      {
        trigger: "/math/abs",
        label: "Absolute",
        icon: "➕",
        description: "Absolute value",
        insert: "{{Math.abs(number)}}",
        placeholders: ["number"],
        example: "{{Math.abs(json.difference)}}",
      },
      {
        trigger: "/math/min",
        label: "Minimum",
        icon: "⬇️",
        description: "Find minimum value",
        insert: "{{Math.min(a, b)}}",
        placeholders: ["a", "b"],
        example: "{{Math.min(json.price1, json.price2)}}",
      },
      {
        trigger: "/math/max",
        label: "Maximum",
        icon: "⬆️",
        description: "Find maximum value",
        insert: "{{Math.max(a, b)}}",
        placeholders: ["a", "b"],
        example: "{{Math.max(json.score1, json.score2)}}",
      },
    ],
  },

  // Utilities
  {
    trigger: "/util",
    label: "Utilities",
    icon: "🔧",
    description: "Utility functions",
    children: [
      {
        trigger: "/util/uuid",
        label: "Generate UUID",
        icon: "🎲",
        description: "Generate unique identifier",
        insert: "{{$uuid()}}",
        example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      },
      {
        trigger: "/util/random",
        label: "Random number",
        icon: "🎰",
        description: "Generate random integer",
        insert: "{{$randomInt(1, 100)}}",
        placeholders: ["1", "100"],
        example: "42",
      },
      {
        trigger: "/util/json",
        label: "JSON stringify",
        icon: "📋",
        description: "Convert to JSON string",
        insert: "{{JSON.stringify(object)}}",
        placeholders: ["object"],
        example: "{{JSON.stringify(json)}}",
      },
      {
        trigger: "/util/parse",
        label: "JSON parse",
        icon: "📖",
        description: "Parse JSON string",
        insert: "{{JSON.parse(string)}}",
        placeholders: ["string"],
        example: "{{JSON.parse(json.data)}}",
      },
    ],
  },

  // JSON Access
  {
    trigger: "/json",
    label: "JSON Data",
    icon: "📦",
    description: "Access JSON data",
    children: [
      {
        trigger: "/json/all",
        label: "All data",
        icon: "📦",
        description: "Access all input data",
        insert: "{{json}}",
        example: '{ "name": "John", "age": 30 }',
      },
      {
        trigger: "/json/field",
        label: "Field",
        icon: "🏷️",
        description: "Access specific field",
        insert: "{{json.fieldName}}",
        placeholders: ["fieldName"],
        example: "{{json.email}}",
      },
      {
        trigger: "/json/nested",
        label: "Nested field",
        icon: "🔗",
        description: "Access nested property",
        insert: "{{json.parent.child}}",
        placeholders: ["parent", "child"],
        example: "{{json.user.address.city}}",
      },
    ],
  },
];

/**
 * Flatten quick actions for searching
 */
export function flattenQuickActions(actions: QuickAction[]): QuickAction[] {
  const flattened: QuickAction[] = [];

  function flatten(action: QuickAction) {
    flattened.push(action);
    if (action.children) {
      action.children.forEach(flatten);
    }
  }

  actions.forEach(flatten);
  return flattened;
}

/**
 * Search quick actions by trigger or label
 */
export function searchQuickActions(query: string): QuickAction[] {
  const allActions = flattenQuickActions(quickActions);
  const queryLower = query.toLowerCase();

  return allActions.filter(
    (action) =>
      action.trigger.toLowerCase().includes(queryLower) ||
      action.label.toLowerCase().includes(queryLower) ||
      action.description.toLowerCase().includes(queryLower)
  );
}
