package com.docmind;

import javax.servlet.*;
import javax.servlet.http.*;
import java.io.IOException;
import java.util.Set;

/**
 * SPA Filter - Forwards non-static-asset requests to index.html
 * so React Router can handle client-side routing.
 */
public class SPAFilter implements Filter {

    private static final Set<String> STATIC_EXTENSIONS = Set.of(
        ".js", ".css", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico",
        ".woff", ".woff2", ".ttf", ".eot", ".map", ".json", ".xml",
        ".webp", ".avif", ".mp4", ".webm", ".pdf"
    );

    private static final Set<String> PASSTHROUGH_PREFIXES = Set.of(
        "/api/", "/extracted-images/"
    );

    @Override
    public void init(FilterConfig filterConfig) {}

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest request = (HttpServletRequest) req;
        HttpServletResponse response = (HttpServletResponse) res;
        String path = request.getRequestURI();

        String contextPath = request.getContextPath();
        if (contextPath != null && !contextPath.isEmpty()) {
            path = path.substring(contextPath.length());
        }

        if (PASSTHROUGH_PREFIXES.stream().anyMatch(path::startsWith)) {
            chain.doFilter(req, res);
            return;
        }

        if (path.contains(".") && STATIC_EXTENSIONS.stream().anyMatch(path::endsWith)) {
            chain.doFilter(req, res);
            return;
        }

        if (path.equals("/") || path.equals("")) {
            chain.doFilter(req, res);
            return;
        }

        request.getRequestDispatcher("/index.html").forward(request, response);
    }

    @Override
    public void destroy() {}
}
