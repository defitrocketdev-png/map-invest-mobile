# Coding Rules - DeFit Atlas App

## File Naming Conventions

### Components
- **React Components**: PascalCase (e.g., `UserProfile.tsx`, `NavigationBar.tsx`)
- **Component files**: Use `.tsx` extension for components with JSX
- **Component folders**: PascalCase matching component name (e.g., `components/UserProfile/`)

### Other Files
- **Utilities/Helpers**: camelCase (e.g., `formatDate.ts`, `apiHelper.ts`)
- **Types**: PascalCase with `.types.ts` suffix (e.g., `User.types.ts`)
- **Constants**: UPPER_SNAKE_CASE for values, camelCase for file (e.g., `apiEndpoints.ts`)
- **Services**: camelCase with `.service.ts` suffix (e.g., `auth.service.ts`)
- **Hooks**: camelCase starting with `use` (e.g., `useAuth.ts`, `useFetch.ts`)
- **Contexts**: PascalCase with `.context.tsx` suffix (e.g., `Auth.context.tsx`)

## Folder Structure

```
/api          - API client, endpoints, and requests
/app          - Expo Router app directory (routes)
/assets       - Images, fonts, and static resources
/components   - Reusable UI components
/config       - Configuration files (env, theme, etc.)
/constants    - App-wide constants
/contexts     - React Context providers
/hooks        - Custom React hooks
/lib          - Third-party library configurations
/services     - Business logic and data services
/store        - State management (Redux/Zustand)
/types        - TypeScript type definitions
/utils        - Utility functions and helpers
```

## Code Organization

### Component Structure
```tsx
// 1. Imports (grouped and ordered)
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { externalLibrary } from 'external-library';
import { ComponentA } from '@/components/ComponentA';
import { useCustomHook } from '@/hooks/useCustomHook';
import { helperFunction } from '@/utils/helper';
import type { UserType } from '@/types/User.types';

// 2. Types/Interfaces (component-specific)
interface ComponentProps {
  title: string;
  onPress?: () => void;
}

// 3. Component
export function Component({ title, onPress }: ComponentProps) {
  // 3a. Hooks
  const [state, setState] = useState();
  const customValue = useCustomHook();

  // 3b. Effects
  useEffect(() => {
    // effect logic
  }, []);

  // 3c. Handlers
  const handlePress = () => {
    // handler logic
  };

  // 3d. Render helpers
  const renderItem = () => {
    // render logic
  };

  // 3e. Return JSX
  return (
    <View style={styles.container}>
      <Text>{title}</Text>
    </View>
  );
}

// 4. Styles (at bottom)
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

### Import Order
1. React and React Native core
2. Third-party libraries
3. Project components (absolute imports with `@/`)
4. Hooks
5. Utils/helpers
6. Types
7. Styles/assets

## TypeScript Rules

### Type Definitions
- **Always use TypeScript** - No `any` types unless absolutely necessary
- **Explicit return types** for functions
- **Interface over type** for object shapes
- **Type over interface** for unions and primitives
- Export types from dedicated `.types.ts` files

```typescript
// Good
interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): Promise<User> {
  // implementation
}

// Bad
function getUser(id) {
  // no types
}
```

### Null/Undefined Handling
- Use optional chaining (`?.`) and nullish coalescing (`??`)
- Avoid `!` (non-null assertion) unless absolutely certain

```typescript
// Good
const userName = user?.profile?.name ?? 'Guest';

// Bad
const userName = user!.profile!.name;
```

## Component Patterns

### Functional Components Only
- Use functional components with hooks
- No class components

### Props Destructuring
- Destructure props in function signature
- Use TypeScript interfaces for props

```typescript
// Good
interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}

export function Button({ title, onPress, disabled = false }: ButtonProps) {
  // component logic
}

// Bad
export function Button(props: ButtonProps) {
  return <Text>{props.title}</Text>;
}
```

### Custom Hooks
- Start with `use` prefix
- Extract reusable logic into custom hooks
- Return object or array, not mixed

```typescript
// Good - Object return
export function useAuth() {
  return {
    user,
    login,
    logout,
    isAuthenticated,
  };
}

// Good - Array return (like useState)
export function useToggle(initial = false): [boolean, () => void] {
  const [value, setValue] = useState(initial);
  const toggle = () => setValue(v => !v);
  return [value, toggle];
}
```

## Styling

### StyleSheet API
- Always use `StyleSheet.create()`
- Define styles at bottom of file
- Use meaningful style names

```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});
```

### Theme and Constants
- Use theme constants from `/config/theme.ts`
- No magic numbers in styles
- Use consistent spacing scale

```typescript
// config/theme.ts
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const COLORS = {
  primary: '#007AFF',
  secondary: '#5856D6',
  // ...
};
```

## State Management

### Local State
- Use `useState` for component-local state
- Use `useReducer` for complex state logic

### Global State
- Use Context API for app-wide state (auth, theme, etc.)
- Consider Zustand or Redux for complex state management
- Store in `/store` directory

## Error Handling

### Try-Catch
- Always wrap async operations in try-catch
- Log errors appropriately
- Show user-friendly error messages

```typescript
try {
  const data = await fetchData();
  setData(data);
} catch (error) {
  console.error('Failed to fetch data:', error);
  // Show user-friendly error
}
```

### Error Boundaries
- Use Error Boundaries for component errors
- Create reusable ErrorBoundary component

## API and Services

### API Calls
- Define API endpoints in `/api`
- Use service layer in `/services`
- Separate concerns (API client, data transformation, business logic)

```typescript
// api/user.api.ts
export const userApi = {
  getUser: (id: string) => api.get(`/users/${id}`),
  updateUser: (id: string, data: UserData) => api.put(`/users/${id}`, data),
};

// services/user.service.ts
export const userService = {
  async getUser(id: string): Promise<User> {
    const response = await userApi.getUser(id);
    return transformUserData(response.data);
  },
};
```

## Naming Conventions

### Variables and Functions
- **camelCase** for variables and functions
- **Boolean variables**: prefix with `is`, `has`, `should`, `can`
- **Event handlers**: prefix with `handle` or `on`

```typescript
const isLoading = false;
const hasPermission = true;
const handleSubmit = () => {};
const onPressButton = () => {};
```

### Constants
- **UPPER_SNAKE_CASE** for true constants
- **camelCase** for configuration objects

```typescript
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = 'https://api.example.com';

const apiConfig = {
  timeout: 5000,
  retries: 3,
};
```

## Comments and Documentation

### When to Comment
- Complex logic that isn't immediately obvious
- Public API functions (JSDoc)
- TODO/FIXME for temporary solutions

```typescript
/**
 * Calculates the user's fitness score based on activity data
 * @param activities - Array of user activities
 * @returns Fitness score between 0-100
 */
export function calculateFitnessScore(activities: Activity[]): number {
  // Implementation
}

// TODO: Add pagination support
// FIXME: Handle edge case where user has no activities
```

### Avoid Obvious Comments
```typescript
// Bad
const user = getUser(); // Get the user

// Good (self-documenting code)
const currentUser = getCurrentAuthenticatedUser();
```

## Git Practices

### Commit Messages
- Use conventional commits format
- Format: `type(scope): description`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

```
feat(auth): add biometric authentication
fix(profile): resolve image upload bug
docs(readme): update installation instructions
refactor(api): simplify error handling
```

### Branching
- `master/main` - production-ready code
- `develop` - integration branch
- `feature/feature-name` - new features
- `fix/bug-name` - bug fixes
- `refactor/description` - refactoring

## Testing

### Test Files
- Co-locate tests with components: `Component.test.tsx`
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

```typescript
describe('Button', () => {
  it('should call onPress when pressed', () => {
    // Arrange
    const onPress = jest.fn();
    const { getByText } = render(<Button title="Click me" onPress={onPress} />);

    // Act
    fireEvent.press(getByText('Click me'));

    // Assert
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
```

## Performance

### Optimization
- Use `React.memo` for expensive components
- Use `useMemo` for expensive calculations
- Use `useCallback` for function props passed to memoized children
- Avoid inline object/array creation in render

```typescript
// Good
const expensiveValue = useMemo(() => computeExpensiveValue(data), [data]);

const handlePress = useCallback(() => {
  doSomething();
}, [dependency]);

// Bad (creates new object every render)
<Component style={{ margin: 10 }} />
```

### Lists
- Always use `key` prop with unique identifiers
- Use `FlatList` for long lists, not `map`

## Security

- Never commit sensitive data (API keys, secrets)
- Use environment variables for configuration
- Validate and sanitize user inputs
- Use HTTPS for all API calls

## Accessibility

- Add `accessibilityLabel` to interactive elements
- Support screen readers
- Ensure sufficient color contrast
- Make touch targets at least 44x44 points

---

**Note**: These rules should be followed consistently throughout the project. When in doubt, refer to this document and discuss with the team.
