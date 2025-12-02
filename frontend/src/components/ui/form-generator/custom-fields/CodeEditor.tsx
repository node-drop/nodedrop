import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import * as React from "react";

export interface CodeEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  disabled?: boolean;
  language?: "javascript" | "python";
  placeholder?: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value = "",
  onChange,
  error,
  disabled,
  language = "javascript",
  placeholder,
}) => {
  const [internalValue, setInternalValue] = React.useState(value || "");

  React.useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    onChange?.(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Auto-indent on Enter
    if (e.key === "Enter") {
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const lineStart = internalValue.lastIndexOf("\n", start - 1) + 1;
      const lineText = internalValue.slice(lineStart, start);
      const indent = lineText.match(/^\s*/)?.[0] || "";

      // Add extra indent if line ends with { or [ or :
      const extraIndent =
        lineText.trim().endsWith("{") ||
        lineText.trim().endsWith("[") ||
        lineText.trim().endsWith(":")
          ? language === "python"
            ? "    " // 4 spaces for Python
            : "  " // 2 spaces for JavaScript
          : "";

      e.preventDefault();
      const newValue =
        internalValue.slice(0, start) +
        "\n" +
        indent +
        extraIndent +
        internalValue.slice(start);

      setInternalValue(newValue);
      onChange?.(newValue);

      // Set cursor position after the new indent
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd =
          start + 1 + indent.length + extraIndent.length;
      }, 0);
    }

    // Auto-complete brackets for JavaScript
    if (language === "javascript") {
      if (e.key === "{") {
        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        e.preventDefault();
        const newValue =
          internalValue.slice(0, start) + "{}" + internalValue.slice(start);

        setInternalValue(newValue);
        onChange?.(newValue);

        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1;
        }, 0);
      }

      if (e.key === "[") {
        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        e.preventDefault();
        const newValue =
          internalValue.slice(0, start) + "[]" + internalValue.slice(start);

        setInternalValue(newValue);
        onChange?.(newValue);

        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1;
        }, 0);
      }

      if (e.key === "(") {
        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        e.preventDefault();
        const newValue =
          internalValue.slice(0, start) + "()" + internalValue.slice(start);

        setInternalValue(newValue);
        onChange?.(newValue);

        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1;
        }, 0);
      }
    }

    // Tab key support - insert spaces instead of tab
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const spaces = language === "python" ? "    " : "  ";

      const newValue =
        internalValue.slice(0, start) + spaces + internalValue.slice(end);

      setInternalValue(newValue);
      onChange?.(newValue);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd =
          start + spaces.length;
      }, 0);
    }
  };

  return (
    <div
      className={cn(
        "relative flex min-h-[400px] border rounded-md overflow-hidden",
        error && "border-destructive"
      )}
    >
      {/* Line Numbers */}
      <div className="flex-shrink-0 select-none bg-muted/30 border-r px-2 py-3 text-xs font-mono text-muted-foreground leading-6">
        {internalValue.split("\n").map((_, index) => (
          <div key={index + 1} className="text-right min-w-[2rem]">
            {index + 1}
          </div>
        ))}
      </div>

      {/* Text Area */}
      <div className="flex-1 relative">
        <Textarea
          className={cn(
            "font-mono text-sm leading-6 resize-none h-full min-h-0 w-full border-0",
            "focus:ring-2 focus:ring-ring focus:ring-offset-0 focus:border-0",
            "transition-colors pl-3 rounded-none",
            error && "focus:ring-destructive"
          )}
          value={internalValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          disabled={disabled}
          placeholder={placeholder || `Enter ${language} code...`}
          aria-invalid={!!error}
          style={{
            outline: "none",
            boxShadow: "none",
          }}
        />
        <div className="absolute top-2 right-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
          {language === "python" ? "Python" : "JavaScript"}
        </div>
      </div>
    </div>
  );
};
