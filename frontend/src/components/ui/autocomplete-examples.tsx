import { AutoComplete, AutoCompleteOption } from "@/components/ui/autocomplete";
import { Building2, Database, FileSpreadsheet, Mail, User } from "lucide-react";
import { useState } from "react";

/**
 * Example 1: Simple Static Options
 */
export function SimpleAutocomplete() {
  const [value, setValue] = useState("");

  const options: AutoCompleteOption[] = [
    { id: "1", label: "Option 1", value: "option1" },
    { id: "2", label: "Option 2", value: "option2" },
    { id: "3", label: "Option 3", value: "option3" },
  ];

  return (
    <AutoComplete
      value={value}
      onChange={setValue}
      options={options}
      placeholder="Select an option..."
    />
  );
}

/**
 * Example 2: With Async Data Loading
 */
interface Company {
  id: string;
  name: string;
  industry: string;
  employees: number;
}

export function CompanySelector() {
  const [companyId, setCompanyId] = useState("");

  const fetchCompanies = async (): Promise<AutoCompleteOption<Company>[]> => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    const companies: Company[] = [
      { id: "1", name: "Acme Corp", industry: "Technology", employees: 500 },
      { id: "2", name: "TechStart Inc", industry: "Software", employees: 150 },
      { id: "3", name: "Global Solutions", industry: "Consulting", employees: 2000 },
    ];

    return companies.map((company) => ({
      id: company.id,
      label: company.name,
      value: company,
      metadata: {
        subtitle: `${company.industry} • ${company.employees} employees`,
        industry: company.industry,
        employees: company.employees,
      },
    }));
  };

  return (
    <AutoComplete<Company>
      value={companyId}
      onChange={setCompanyId}
      onFetch={fetchCompanies}
      preloadOnMount={true}
      icon={<Building2 className="w-4 h-4 text-blue-600" />}
      placeholder="Select a company..."
      searchPlaceholder="Search companies..."
    />
  );
}

/**
 * Example 3: With Search API
 */
interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
}

export function UserSearchAutocomplete() {
  const [userId, setUserId] = useState("");

  const searchUsers = async (query: string): Promise<AutoCompleteOption<User>[]> => {
    // Simulate API search
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    const users: User[] = [
      { 
        id: "1", 
        name: "John Doe", 
        email: "john@example.com", 
        role: "Admin",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=John"
      },
      { 
        id: "2", 
        name: "Jane Smith", 
        email: "jane@example.com", 
        role: "User",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jane"
      },
    ].filter(user => 
      user.name.toLowerCase().includes(query.toLowerCase()) ||
      user.email.toLowerCase().includes(query.toLowerCase())
    );

    return users.map((user) => ({
      id: user.id,
      label: user.name,
      value: user,
      metadata: {
        subtitle: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    }));
  };

  return (
    <AutoComplete<User>
      value={userId}
      onChange={setUserId}
      onSearch={searchUsers}
      icon={<User className="w-4 h-4 text-purple-600" />}
      placeholder="Select a user..."
      searchPlaceholder="Search by name or email..."
      preloadOnFocus={true}
      renderOption={(option) => (
        <div className="flex items-center gap-3 w-full">
          <img 
            src={option.metadata?.avatar} 
            alt={option.label}
            className="w-8 h-8 rounded-full"
          />
          <div className="flex-1">
            <p className="text-sm font-medium">{option.label}</p>
            <p className="text-xs text-muted-foreground">{option.metadata?.subtitle}</p>
          </div>
          <span className="text-xs px-2 py-1 bg-gray-100 rounded">
            {option.metadata?.role}
          </span>
        </div>
      )}
      renderSelected={(option) => (
        <div className="flex items-center gap-2">
          <img 
            src={option.metadata?.avatar} 
            alt={option.label}
            className="w-6 h-6 rounded-full"
          />
          <span>{option.label}</span>
        </div>
      )}
    />
  );
}

/**
 * Example 4: Database Table Selector
 */
interface DatabaseTable {
  name: string;
  schema: string;
  rowCount: number;
  lastModified: string;
}

export function DatabaseTableSelector({ connectionId }: { connectionId?: string }) {
  const [tableName, setTableName] = useState("");

  const fetchTables = async (): Promise<AutoCompleteOption<DatabaseTable>[]> => {
    if (!connectionId) {
      throw new Error("Please select a database connection first");
    }

    const response = await fetch(`/api/databases/${connectionId}/tables`);
    
    if (!response.ok) {
      throw new Error("Failed to fetch tables");
    }

    const tables: DatabaseTable[] = await response.json();

    return tables.map((table) => ({
      id: `${table.schema}.${table.name}`,
      label: table.name,
      value: table,
      metadata: {
        subtitle: `${table.schema} • ${table.rowCount.toLocaleString()} rows`,
        schema: table.schema,
        rowCount: table.rowCount,
        lastModified: table.lastModified,
      },
    }));
  };

  return (
    <div className="space-y-2">
      <AutoComplete<DatabaseTable>
        value={tableName}
        onChange={setTableName}
        onFetch={fetchTables}
        preloadOnMount={!!connectionId}
        icon={<Database className="w-4 h-4 text-orange-600" />}
        placeholder="Select a table..."
        searchPlaceholder="Search tables..."
        emptyMessage={!connectionId ? "Please select a connection first" : "No tables found"}
        disabled={!connectionId}
        maxHeight={400}
      />
      
      {!connectionId && (
        <p className="text-xs text-amber-600">
          ⚠️ Please configure database connection first
        </p>
      )}
    </div>
  );
}

/**
 * Example 5: Email Template Selector with Custom Rendering
 */
interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  category: string;
  thumbnail?: string;
  usageCount: number;
}

export function EmailTemplateSelector() {
  const [templateId, setTemplateId] = useState("");

  const fetchTemplates = async (): Promise<AutoCompleteOption<EmailTemplate>[]> => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    const templates: EmailTemplate[] = [
      { 
        id: "1", 
        name: "Welcome Email", 
        subject: "Welcome to our platform!",
        category: "Onboarding",
        usageCount: 150 
      },
      { 
        id: "2", 
        name: "Password Reset", 
        subject: "Reset your password",
        category: "Security",
        usageCount: 89 
      },
      { 
        id: "3", 
        name: "Weekly Newsletter", 
        subject: "Your weekly update",
        category: "Marketing",
        usageCount: 230 
      },
    ];

    return templates.map((template) => ({
      id: template.id,
      label: template.name,
      value: template,
      metadata: {
        subtitle: template.subject,
        category: template.category,
        usageCount: template.usageCount,
      },
    }));
  };

  return (
    <AutoComplete<EmailTemplate>
      value={templateId}
      onChange={(id, option) => {
        setTemplateId(id);
        console.log("Selected template:", option?.value);
      }}
      onFetch={fetchTemplates}
      preloadOnMount={true}
      icon={<Mail className="w-4 h-4 text-red-600" />}
      placeholder="Select a template..."
      renderOption={(option) => (
        <div className="flex flex-col gap-1 w-full">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{option.label}</span>
            <span className="text-xs text-muted-foreground">
              {option.metadata?.usageCount} uses
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{option.metadata?.subtitle}</p>
          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded w-fit">
            {option.metadata?.category}
          </span>
        </div>
      )}
    />
  );
}

/**
 * Example 6: Custom Filter Function
 */
interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  tags: string[];
}

export function ProductSelector() {
  const [productId, setProductId] = useState("");

  const products: AutoCompleteOption<Product>[] = [
    {
      id: "1",
      label: "Laptop Pro",
      value: { 
        id: "1", 
        name: "Laptop Pro", 
        sku: "LAP-001", 
        category: "Electronics",
        tags: ["computer", "portable", "work"]
      },
      metadata: { 
        subtitle: "SKU: LAP-001 • Electronics",
        sku: "LAP-001",
        category: "Electronics",
        tags: ["computer", "portable", "work"]
      },
    },
    {
      id: "2",
      label: "Wireless Mouse",
      value: { 
        id: "2", 
        name: "Wireless Mouse", 
        sku: "MOU-002", 
        category: "Accessories",
        tags: ["peripheral", "wireless", "office"]
      },
      metadata: { 
        subtitle: "SKU: MOU-002 • Accessories",
        sku: "MOU-002",
        category: "Accessories",
        tags: ["peripheral", "wireless", "office"]
      },
    },
  ];

  // Custom filter that searches in name, SKU, category, and tags
  const customFilter = (option: AutoCompleteOption<Product>, term: string): boolean => {
    const searchTerm = term.toLowerCase();
    return (
      option.label.toLowerCase().includes(searchTerm) ||
      option.metadata?.sku?.toLowerCase().includes(searchTerm) ||
      option.metadata?.category?.toLowerCase().includes(searchTerm) ||
      option.metadata?.tags?.some((tag: string) => tag.toLowerCase().includes(searchTerm))
    );
  };

  return (
    <AutoComplete<Product>
      value={productId}
      onChange={setProductId}
      options={products}
      filterFn={customFilter}
      placeholder="Search by name, SKU, category, or tags..."
      searchPlaceholder="Search products..."
      icon={<FileSpreadsheet className="w-4 h-4 text-green-600" />}
    />
  );
}

/**
 * Example 7: Complete Form Integration
 */
export function CompleteFormExample() {
  return (
    <div className="space-y-6 p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold">AutoComplete Examples</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Company</label>
          <CompanySelector />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Assign To</label>
          <UserSearchAutocomplete />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Database Table</label>
          <DatabaseTableSelector connectionId="conn-123" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Email Template</label>
          <EmailTemplateSelector />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Product</label>
          <ProductSelector />
        </div>
      </div>
    </div>
  );
}
