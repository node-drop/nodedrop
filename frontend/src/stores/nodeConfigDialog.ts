import { NodeSettingsConfig, NodeType, WorkflowNode } from "@/types";
import { ValidationError } from "@/utils/nodeValidation";
import { createWithEqualityFn } from "zustand/traditional";

interface MockDataEditor {
  isOpen: boolean;
  content: string;
}

interface NodeConfigDialogState {
  // Dialog state
  isOpen: boolean;
  node: WorkflowNode | null;
  nodeType: NodeType | null;

  // Form state
  parameters: Record<string, any>;
  nodeName: string;
  isDisabled: boolean;
  credentials: Record<string, string>;
  mockData: any;
  mockDataPinned: boolean;
  nodeSettings: NodeSettingsConfig;

  // UI state
  validationErrors: ValidationError[];
  hasUnsavedChanges: boolean;
  isEditingName: boolean;
  isExecuting: boolean;
  mockDataEditor: MockDataEditor;
  activeTab: string;

  // Actions
  openDialog: (node: WorkflowNode, nodeType: NodeType) => void;
  closeDialog: () => void;
  updateParameters: (propertyName: string, value: any) => void;
  updateNodeName: (name: string) => void;
  updateDisabled: (disabled: boolean) => void;
  updateCredentials: (
    credentialType: string,
    credentialId: string | undefined
  ) => void;
  updateMockData: (data: any) => void;
  toggleMockDataPinned: () => void;
  updateNodeSettings: (settings: NodeSettingsConfig) => void;
  setValidationErrors: (errors: ValidationError[]) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  setIsEditingName: (isEditing: boolean) => void;
  setIsExecuting: (isExecuting: boolean) => void;
  openMockDataEditor: () => void;
  closeMockDataEditor: () => void;
  updateMockDataContent: (content: string) => void;
  setActiveTab: (tab: string) => void;
  resetState: () => void;
}

const initialState = {
  isOpen: false,
  node: null,
  nodeType: null,
  parameters: {},
  nodeName: "",
  isDisabled: false,
  credentials: {},
  mockData: null,
  mockDataPinned: false,
  nodeSettings: {},
  validationErrors: [],
  hasUnsavedChanges: false,
  isEditingName: false,
  isExecuting: false,
  mockDataEditor: {
    isOpen: false,
    content: "",
  },
  activeTab: "config",
};

export const useNodeConfigDialogStore = createWithEqualityFn<NodeConfigDialogState>(
  (set, get) => ({
    ...initialState,

    openDialog: (node: WorkflowNode, nodeType: NodeType) => {
      // Map credential IDs to their types using nodeType.credentials
      const credentialsMap: Record<string, string> = {};
      if (node.credentials && Array.isArray(node.credentials)) {
        node.credentials.forEach((credId, index) => {
          // Get the credential type from nodeType.credentials at the same index
          if (nodeType.credentials && nodeType.credentials[index]) {
            const credentialType = nodeType.credentials[index].name;
            credentialsMap[credentialType] = credId;
          }
        });
      }

      set({
        isOpen: true,
        node,
        nodeType,
        parameters: node.parameters,
        nodeName: node.name,
        isDisabled: node.disabled,
        credentials: credentialsMap,
        mockData: node.mockData || null,
        mockDataPinned: node.mockDataPinned || false,
        nodeSettings: node.settings || {},
        hasUnsavedChanges: false,
        validationErrors: [],
        mockDataEditor: {
          isOpen: false,
          content: node.mockData ? JSON.stringify(node.mockData, null, 2) : "",
        },
      });
    },

    closeDialog: () => {
      set({ ...initialState });
    },

    updateParameters: (propertyName: string, value: any) => {
      const { parameters } = get();
      set({
        parameters: { ...parameters, [propertyName]: value },
        hasUnsavedChanges: true,
      });
    },

    updateNodeName: (name: string) => {
      set({
        nodeName: name,
        hasUnsavedChanges: true,
      });
    },

    updateDisabled: (disabled: boolean) => {
      set({
        isDisabled: disabled,
        hasUnsavedChanges: true,
      });
    },

    updateCredentials: (
      credentialType: string,
      credentialId: string | undefined
    ) => {
      const { credentials } = get();
      const newCredentials = { ...credentials };

      if (credentialId) {
        newCredentials[credentialType] = credentialId;
      } else {
        delete newCredentials[credentialType];
      }

      set({
        credentials: newCredentials,
        hasUnsavedChanges: true,
      });
    },

    updateMockData: (data: any) => {
      set({
        mockData: data,
        hasUnsavedChanges: true,
        mockDataEditor: {
          ...get().mockDataEditor,
          content: data ? JSON.stringify(data, null, 2) : "",
        },
      });
    },

    toggleMockDataPinned: () => {
      set({
        mockDataPinned: !get().mockDataPinned,
        hasUnsavedChanges: true,
      });
    },

    updateNodeSettings: (settings: NodeSettingsConfig) => {
      set({
        nodeSettings: settings,
        hasUnsavedChanges: true,
      });
    },

    setValidationErrors: (errors: ValidationError[]) => {
      set({ validationErrors: errors });
    },

    setHasUnsavedChanges: (hasChanges: boolean) => {
      set({ hasUnsavedChanges: hasChanges });
    },

    setIsEditingName: (isEditing: boolean) => {
      set({ isEditingName: isEditing });
    },

    setIsExecuting: (isExecuting: boolean) => {
      set({ isExecuting: isExecuting });
    },

    openMockDataEditor: () => {
      set({
        mockDataEditor: {
          ...get().mockDataEditor,
          isOpen: true,
        },
      });
    },

    closeMockDataEditor: () => {
      set({
        mockDataEditor: {
          ...get().mockDataEditor,
          isOpen: false,
        },
      });
    },

    updateMockDataContent: (content: string) => {
      set({
        mockDataEditor: {
          ...get().mockDataEditor,
          content,
        },
      });
    },

    setActiveTab: (tab: string) => {
      set({ activeTab: tab });
    },

    resetState: () => {
      set({ ...initialState });
    },
  })
);
