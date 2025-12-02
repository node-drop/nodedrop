# Custom Template Node - CLI Registration Guide

## ✅ Successfully Registered!

The `CustomTemplateNode` has been successfully registered via CLI!

## Registration Summary

**Total Nodes Registered:** 9

- ✅ HTTP Request (http-request)
- ✅ JSON (json)
- ✅ Set (set)
- ✅ IF (if)
- ✅ Webhook Trigger (webhook-trigger)
- ✅ Schedule Trigger (schedule-trigger)
- ✅ Manual Trigger (manual-trigger)
- ✅ Dynamic Properties Example (dynamic-properties-example)
- ✅ **Custom Template Example (custom-template-example)** ⭐

## CLI Commands

### Register All Built-in Nodes

```bash
npm run nodes:register
```

### List All Registered Nodes

```bash
npm run node-cli list
```

### Validate a Node Package

```bash
npm run node-cli validate <path-to-node>
```

### Test a Node

```bash
npm run node-cli test <path-to-node> --input data.json --params '{"param":"value"}'
```

### Install a Custom Node Package

```bash
npm run node-cli install <path-to-package>
```

### Uninstall a Node Package

```bash
npm run node-cli uninstall <package-name>
```

## What Changed

1. **Added Export** (`backend/src/nodes/examples/index.ts`)

   ```typescript
   export { CustomTemplateNode } from "./CustomTemplate.node";
   ```

2. **Updated Registration Script** (`backend/src/scripts/register-nodes.ts`)

   ```typescript
   const { DynamicPropertiesNode, CustomTemplateNode } = await import(
     "../nodes/examples"
   );
   ```

3. **Updated Node Service** (`backend/src/services/NodeService.ts`)

   - Added `CustomTemplateNode` to built-in nodes
   - Added `"custom"` to valid property types

4. **Fixed Validation**
   - Added `"custom"` type to the validTypes array in NodeService

## Custom Template Node Details

**Type:** `custom-template-example`
**Display Name:** Custom Template Example
**Category:** Transform
**Version:** 1

### Custom Components Included

1. **JsonEditor** - JSON Schema Editor
2. **CodeEditor** - Monaco Code Editor
3. **QueryBuilder** - Visual Query Builder
4. **FieldMapper** - Drag-and-Drop Field Mapper
5. **WizardForm** - Multi-Step Configuration Wizard
6. **RichTextEditor** - WYSIWYG Editor
7. **TableEditor** - Spreadsheet-like Table

## Verify Registration

### Check in Database

```bash
npm run db:studio
```

Then navigate to the `NodeType` table to see `custom-template-example`.

### API Endpoint

```bash
curl http://localhost:3000/api/nodes
```

### Frontend

The node should now appear in the node palette in the frontend under "Transform" category.

## Development Workflow

1. **Make changes to your node**

   ```bash
   # Edit: backend/src/nodes/examples/CustomTemplate.node.ts
   ```

2. **Re-register the node**

   ```bash
   npm run nodes:register
   ```

3. **Restart the server** (if running)
   ```bash
   npm run dev
   ```

## Next Steps

1. **Frontend Integration**

   - Implement the custom components in the frontend
   - Register components in `frontend/src/components/custom-fields/`

2. **Testing**

   - Create unit tests for the custom template node
   - Test with different input data

3. **Documentation**
   - Add usage examples
   - Document component props

## Troubleshooting

### Node not showing in list?

```bash
# Re-run registration
npm run nodes:register

# Check database
npm run db:studio
```

### Validation errors?

- Make sure all property types are valid
- Check that `type: "custom"` is used correctly
- Verify `component` and `componentProps` are properly defined

### Can't execute node?

- Check the execute function implementation
- Verify input/output format
- Check console logs for errors

## Files Modified

- ✅ `backend/src/nodes/examples/index.ts`
- ✅ `backend/src/nodes/examples/CustomTemplate.node.ts`
- ✅ `backend/src/scripts/register-nodes.ts`
- ✅ `backend/src/services/NodeService.ts`

## Documentation Created

- ✅ `docs/CUSTOM_TEMPLATES.md` - Full documentation
- ✅ `docs/CUSTOM_TEMPLATES_QUICK_REF.md` - Quick reference
- ✅ `docs/CLI_REGISTRATION.md` - This file

---

**Status:** ✅ Ready to use!

You can now use the Custom Template Node in your workflows!
