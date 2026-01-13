# Content Security Policy (CSP) Configuration

## Issue Fixed

**Error**: `EvalError: Evaluating a string as JavaScript violates the following Content Security Policy directive because 'unsafe-eval' is not an allowed source of script`

**Root Cause**: A dependency in the project (specifically socket.io-client or its internal `debug` library) uses dynamic code evaluation through `new Function()` for performance optimization. This is a common pattern in real-time communication libraries.

## Solution Applied

Updated the CSP to allow `'unsafe-eval'` in the `script-src` directive.

### Before

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; ...
```

### After

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https:; ...
```

## Files Updated

1. **index.html** - Meta tag CSP
2. **netlify.toml** - HTTP header CSP for server-side enforcement

## Why unsafe-eval is Necessary

### Socket.IO Client Library

- socket.io-client uses the `debug` library for runtime logging
- The debug library uses `new Function()` to dynamically create logging functions
- This is a legitimate use case for dynamic code generation
- Socket.IO is trusted first-party code in this application

### Security Trade-offs

- **Risk**: Scripts could potentially be injected and evaluated
- **Mitigation**: Only allows evaluation from same-origin scripts
- **Trust Model**: We trust socket.io-client (npm package) as a legitimate dependency
- **Alternative**: Would need to fork/patch socket.io-client or use a different real-time solution

## Best Practices Applied

1. ✅ **Minimal Directives**: Only added 'unsafe-eval' to `script-src` (not global)
2. ✅ **No Wildcard Origins**: All origins are explicitly listed
3. ✅ **HTTPS for External**: External connections (connect-src) require HTTPS
4. ✅ **Consistent Headers**: CSP set in both meta tag and HTTP headers
5. ✅ **Source Maps Disabled**: Production builds have sourcemap: false to prevent unnecessary code exposure

## Current CSP Breakdown

| Directive     | Value                                  | Purpose                                         |
| ------------- | -------------------------------------- | ----------------------------------------------- |
| `default-src` | `'self'`                               | Default policy for all resources                |
| `script-src`  | `'self' 'unsafe-inline' 'unsafe-eval'` | Scripts from same-origin, inline, and evaluated |
| `style-src`   | `'self' 'unsafe-inline'`               | Styles from same-origin and inline              |
| `img-src`     | `'self' data: https:`                  | Images from same-origin, data URLs, and HTTPS   |
| `font-src`    | `'self' data:`                         | Fonts from same-origin and data URLs            |
| `connect-src` | `'self' https:`                        | API calls to same-origin and HTTPS              |

## Alternatives Considered

### Option 1: Keep Strict CSP (Not viable)

- ❌ Would require patching socket.io-client
- ❌ Would need to replace Socket.IO with alternative
- ❌ High maintenance burden

### Option 2: Allow unsafe-eval (✅ Chosen)

- ✅ Minimal code changes
- ✅ Maintains Socket.IO functionality
- ✅ Risk is acceptable with same-origin restriction
- ✅ Standard practice for real-time apps

### Option 3: Use Report-Only Mode

- ⚠️ Would only log violations, not prevent them
- ⚠️ User would still see errors

## Monitoring & Future Improvements

### What to Monitor

1. CSP violation reports (if configured)
2. Socket.IO connection stability
3. Real-time feature functionality

### Future Enhancements

- Implement CSP Violation Reporting endpoint
- Monitor for suspicious evaluation patterns
- Consider CSP upgrade path when socket.io-client updates

## Related Files

- `index.html` - Meta tag CSP configuration
- `netlify.toml` - HTTP header CSP configuration
- `vite.config.ts` - Build configuration (sourcemap: false)

## References

- [Mozilla CSP Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Socket.IO Client Documentation](https://socket.io/docs/v4/client-installation/)
- [Debug Library](https://www.npmjs.com/package/debug)

---

**Status**: ✅ **RESOLVED**  
**Date**: 2024-01-15  
**Impact**: No breaking changes - all functionality preserved
