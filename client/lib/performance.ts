/**
 * Performance monitoring and optimization utilities
 */

/**
 * Report Web Vitals metrics
 */
export function reportWebVitals(): void {
  // Check if Web Vitals API is available
  if ("web-vital" in window) {
    return;
  }

  // Monitor Largest Contentful Paint (LCP)
  if ("PerformanceObserver" in window) {
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log(
          "[Performance] LCP:",
          lastEntry.renderTime || lastEntry.loadTime,
        );
      });
      lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });
    } catch (error) {
      console.log("[Performance] LCP observation not supported");
    }

    // Monitor First Input Delay (FID)
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          console.log("[Performance] FID:", entry.processingDuration);
        });
      });
      fidObserver.observe({ entryTypes: ["first-input"] });
    } catch (error) {
      console.log("[Performance] FID observation not supported");
    }

    // Monitor Cumulative Layout Shift (CLS)
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            console.log("[Performance] CLS:", clsValue);
          }
        });
      });
      clsObserver.observe({ entryTypes: ["layout-shift"] });
    } catch (error) {
      console.log("[Performance] CLS observation not supported");
    }
  }

  // Log page load time
  window.addEventListener("load", () => {
    const perfData = window.performance.timing;
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
    console.log("[Performance] Page Load Time:", pageLoadTime, "ms");

    // Detailed metrics
    const dnsTime = perfData.domainLookupEnd - perfData.domainLookupStart;
    const tcpTime = perfData.connectEnd - perfData.connectStart;
    const ttfb = perfData.responseStart - perfData.navigationStart;
    const renderTime = perfData.domComplete - perfData.domLoading;

    console.log("[Performance] DNS:", dnsTime, "ms");
    console.log("[Performance] TCP:", tcpTime, "ms");
    console.log("[Performance] TTFB:", ttfb, "ms");
    console.log("[Performance] Render Time:", renderTime, "ms");
  });
}

/**
 * Measure function execution time
 */
export function measureExecutionTime(
  label: string,
  fn: () => void | Promise<void>,
): Promise<number> {
  return Promise.resolve().then(() => {
    const start = performance.now();
    const result = fn();

    if (result instanceof Promise) {
      return result.then(() => {
        const end = performance.now();
        const duration = end - start;
        console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
        return duration;
      });
    }

    const end = performance.now();
    const duration = end - start;
    console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
    return duration;
  });
}

/**
 * Prefetch resources for better performance
 */
export function prefetchResource(url: string, as: string = "script"): void {
  const link = document.createElement("link");
  link.rel = "prefetch";
  link.href = url;
  if (as) {
    link.as = as;
  }
  document.head.appendChild(link);
}

/**
 * Preload critical resources
 */
export function preloadResource(url: string, as: string = "script"): void {
  const link = document.createElement("link");
  link.rel = "preload";
  link.href = url;
  if (as) {
    link.as = as;
  }
  document.head.appendChild(link);
}

/**
 * Lazy load images using Intersection Observer
 */
export function lazyLoadImages(): void {
  if (!("IntersectionObserver" in window)) {
    return;
  }

  const images = document.querySelectorAll("img[data-src]");

  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        img.src = img.dataset.src || "";
        img.removeAttribute("data-src");
        observer.unobserve(img);
      }
    });
  });

  images.forEach((img) => imageObserver.observe(img));
}

/**
 * Enable critical CSS
 */
export function loadCriticalCSS(): void {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/css/critical.css";
  document.head.appendChild(link);
}

/**
 * Optimize long tasks
 */
export function deferLongTask(fn: () => void, delay: number = 0): void {
  if ("scheduler" in window && "yield" in (window as any).scheduler) {
    (window as any).scheduler.yield().then(() => fn());
  } else if (delay > 0) {
    setTimeout(fn, delay);
  } else {
    requestIdleCallback(fn);
  }
}

/**
 * Log performance metrics to monitoring service
 */
export function logPerformanceMetrics(metrics: Record<string, number>): void {
  // This would typically send metrics to a monitoring service
  // like Google Analytics, Sentry, or a custom analytics endpoint
  if (navigator.sendBeacon) {
    const data = new FormData();
    Object.entries(metrics).forEach(([key, value]) => {
      data.append(key, String(value));
    });
    navigator.sendBeacon("/api/metrics", data);
  }
}
