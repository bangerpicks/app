# Figma MCP Integration Guide

## Overview

Banger Picks uses Figma for design and layout, with integration through Model Context Protocol (MCP) in Cursor. This allows chat agents to help develop the app by accessing Figma designs directly.

## What is MCP?

Model Context Protocol (MCP) is a protocol that allows AI assistants to interact with external tools and services, including Figma. In Cursor, MCP enables chat agents to:

- View Figma designs and components
- Extract design specifications
- Generate code from designs
- Access design tokens (colors, typography, spacing)
- Export assets and images

## Figma Setup

### 1. Figma Desktop App

For MCP integration to work, you need the Figma desktop app installed:

1. Download from [figma.com/downloads](https://www.figma.com/downloads/)
2. Install and sign in to your Figma account
3. Ensure the app is running when using MCP tools

### 2. Figma File Access

1. Create or open your Figma design file for Banger Picks
2. Ensure you have access permissions set correctly
3. Note the File Key from the Figma URL:
   - URL format: `https://figma.com/design/{FILE_KEY}/Project-Name?node-id={NODE_ID}`
   - The File Key is the string between `/design/` and `/`

### 3. Figma MCP Configuration

MCP Figma server should be configured in your Cursor settings. Verify that:

- Figma MCP server is enabled
- Authentication is configured (if required)
- Desktop app is running

## Using Figma with MCP in Cursor

### Getting Design Context

When you want to reference a Figma design, you can:

1. **Share a Figma URL** with the chat agent
2. The agent can access the design via MCP
3. Ask the agent to:
   - Describe the design
   - Extract design tokens (colors, fonts, spacing)
   - Generate code from the design
   - Export assets

### Common Workflows

#### 1. Design Review

**Example**: "Can you review the login page design from this Figma file: [URL]"

The agent can:
- View the design
- Identify components
- Extract design specifications
- Suggest improvements

#### 2. Code Generation

**Example**: "Generate a React component based on this Figma design: [URL]"

The agent can:
- Analyze the design structure
- Extract layout and styling
- Generate TypeScript/React code
- Match brand colors from `brand-info/colors.txt`

#### 3. Design Token Extraction

**Example**: "Extract the colors and typography from this design: [URL]"

The agent can:
- Extract color values
- Identify typography scales
- Extract spacing values
- Update Tailwind config accordingly

#### 4. Asset Export

**Example**: "Export the logo from this design: [URL]"

The agent can:
- Export images
- Export SVGs
- Optimize assets
- Save to appropriate directories

## Design System Integration

### Brand Colors

Banger Picks uses the following brand colors (from `brand-info/colors.txt`):

- **Primary**: `#daff00` (lime-yellow) - wins
- **Secondary**: `#240830` (midnight-violet)
- **Tertiary**: `#fdfff0` (ivory)
- **Quaternary**: `#ff9b00` (amber-glow) - draws
- **Quinary**: `#ee4136` (cinnabar) - losses

When exporting designs from Figma, ensure these colors are used consistently.

### Typography

Extract typography from Figma:
- Font families
- Font sizes
- Font weights
- Line heights
- Letter spacing

Update `tailwind.config.ts` with these values.

### Spacing

Extract spacing values:
- Padding values
- Margin values
- Gap values
- Border radius values

Update Tailwind config for consistent spacing.

## Figma File Organization

### Recommended Structure

```
Banger Picks Design
├── 🎨 Design System
│   ├── Colors
│   ├── Typography
│   ├── Spacing
│   └── Components
├── 📱 Pages
│   ├── Landing / Home
│   ├── Authentication (Login/Signup)
│   ├── Predictions (dashaboard)
│   ├── Leaderboard
│   ├── Profile
│   ├── Shop
│   └── Admin Dashboard
└── 🧩 Components
    ├── Buttons
    ├── Cards
    ├── Forms
    ├── Navigation
    └── Layouts
```

### Naming Conventions

- Use clear, descriptive names for frames and components
- Follow consistent naming: `Component/Variant/State`
- Use Auto Layout for responsive designs
- Add descriptions for complex components

## MCP Commands Reference

### Available MCP Figma Tools

When using MCP with Figma in Cursor, the following tools are available:

1. **Get Design Context** - Extract design details and generate code
2. **Get Screenshot** - Capture design screenshots
3. **Get Metadata** - Get structure and organization info
4. **Get Variable Defs** - Extract design tokens/variables
5. **Get Code Connect Map** - Map designs to code components
6. **Add Code Connect** - Link designs to code components

### Using in Chat

**Example prompts**:

```
"Can you view this Figma design and help me implement it: [URL]"

"Extract the color values from this design system: [URL]"

"Generate a Tailwind config based on this Figma design: [URL]"

"Create a React component matching this Figma component: [URL]"

"Export the logo SVG from this design: [URL]"
```

## Development Workflow

### 1. Design Phase (Figma)

- Create designs in Figma
- Define design system
- Create component library
- Design all pages and states

### 2. Review Phase (Figma + Cursor)

- Share Figma URLs with chat agent
- Review designs and specifications
- Extract design tokens
- Identify reusable components

### 3. Implementation Phase (Cursor + Code)

- Generate code from designs
- Export assets as needed
- Implement components
- Match design specifications

### 4. Iteration Phase

- Compare implementation with design
- Make adjustments
- Update design or code as needed
- Maintain consistency

## Best Practices

### Design to Code

1. **Use Figma Variables** - Define colors, spacing, and typography as variables
2. **Name Components Clearly** - Makes code generation easier
3. **Use Auto Layout** - Translates better to CSS Flexbox/Grid
4. **Document Interactions** - Add notes for complex behaviors
5. **Export Assets Properly** - Use appropriate formats (SVG for icons, PNG/JPG for images)

### Code Generation

1. **Share Node IDs** - Include specific node IDs in URLs for precise selection
2. **Describe Requirements** - Tell the agent what you need (component, page, etc.)
3. **Specify Framework** - Mention Next.js, React, TypeScript, Tailwind CSS
4. **Reference Brand** - Remind agent of brand colors from `brand-info/colors.txt`

### Asset Management

1. **Export to `public/images/`** - Store exported assets here
2. **Optimize Images** - Use Next.js Image component for optimization
3. **Use SVGs** - Prefer SVG for icons and logos
4. **Naming Conventions** - Use kebab-case for file names

## Troubleshooting

### MCP Not Working

1. **Check Figma Desktop App** - Ensure it's running
2. **Verify Authentication** - Check MCP server configuration
3. **Check File Access** - Ensure you have access to the Figma file
4. **Verify URL Format** - Ensure Figma URL is correct

### Design Not Found

1. **Check File Key** - Verify file key in URL
2. **Check Node ID** - Ensure node ID is correct
3. **Check Permissions** - Ensure file is accessible
4. **Try Different Node** - Select a parent frame/component

### Code Generation Issues

1. **Be Specific** - Provide detailed requirements
2. **Share Multiple Nodes** - If needed for context
3. **Review Generated Code** - Always review and test
4. **Iterate** - Refine through conversation

## Example Workflow

### Complete Example

1. **Design in Figma**
   - Create login page design
   - Use brand colors from `brand-info/colors.txt`
   - Define typography and spacing

2. **Share with Agent**
   ```
   "I've designed a login page in Figma. Can you help me implement it?
   URL: https://figma.com/design/ABC123/Banger-Picks?node-id=1:234"
   ```

3. **Agent Actions**
   - Views design via MCP
   - Extracts colors, typography, layout
   - Generates Next.js component code
   - Matches brand colors

4. **Review and Implement**
   - Review generated code
   - Test component
   - Make adjustments
   - Deploy

## Resources

- **Figma Documentation**: [figma.com/help](https://help.figma.com/)
- **Figma Desktop App**: [figma.com/downloads](https://www.figma.com/downloads/)
- **Cursor Documentation**: [cursor.sh/docs](https://cursor.sh/docs)
- **MCP Documentation**: [modelcontextprotocol.io](https://modelcontextprotocol.io/)

## Notes

- Figma designs are drafts and may change during development
- Always review generated code before implementation
- Maintain consistency between design and implementation
- Update designs as needed based on development constraints
- Use Figma as the source of truth for design specifications
