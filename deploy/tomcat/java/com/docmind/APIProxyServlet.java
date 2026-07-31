package com.docmind;

import javax.servlet.*;
import javax.servlet.http.*;
import java.io.*;
import java.net.*;
import java.util.Enumeration;

/**
 * API Reverse Proxy Servlet - Forwards /api/* requests to the FastAPI backend.
 */
public class APIProxyServlet extends HttpServlet {

    private String backendUrl = "http://127.0.0.1:8000";

    @Override
    public void init(ServletConfig config) throws ServletException {
        super.init(config);
        String url = config.getInitParameter("backendUrl");
        if (url != null && !url.isEmpty()) {
            this.backendUrl = url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
        }
    }

    @Override
    protected void service(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {

        String pathInfo = req.getPathInfo();
        if (pathInfo == null) pathInfo = req.getServletPath();
        if (pathInfo == null) pathInfo = "";

        String queryString = req.getQueryString();
        URL url;
        try {
            URI uri;
            if (queryString != null && !queryString.isEmpty()) {
                uri = new URI("http", null, "127.0.0.1", 8000, "/api" + pathInfo, queryString, null);
            } else {
                uri = new URI("http", null, "127.0.0.1", 8000, "/api" + pathInfo, null, null);
            }
            url = uri.toURL();
        } catch (URISyntaxException e) {
            resp.sendError(HttpServletResponse.SC_BAD_REQUEST, "Invalid URL path");
            return;
        }
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        try {
            conn.setRequestMethod(req.getMethod());
            conn.setDoOutput(true);
            conn.setDoInput(true);
            conn.setConnectTimeout(30000);
            conn.setReadTimeout(120000);

            Enumeration<String> headerNames = req.getHeaderNames();
            while (headerNames.hasMoreElements()) {
                String name = headerNames.nextElement();
                if (name.equalsIgnoreCase("host") || name.equalsIgnoreCase("connection")) continue;
                Enumeration<String> values = req.getHeaders(name);
                while (values.hasMoreElements()) {
                    conn.addRequestProperty(name, values.nextElement());
                }
            }

            conn.setRequestProperty("X-Forwarded-For", req.getRemoteAddr());
            conn.setRequestProperty("X-Forwarded-Proto", req.getScheme());
            conn.setRequestProperty("X-Forwarded-Host", req.getServerName());

            if ("POST".equals(req.getMethod()) || "PUT".equals(req.getMethod()) || "PATCH".equals(req.getMethod())) {
                InputStream reqBody = req.getInputStream();
                OutputStream connOut = conn.getOutputStream();
                byte[] buffer = new byte[8192];
                int bytesRead;
                while ((bytesRead = reqBody.read(buffer)) != -1) {
                    connOut.write(buffer, 0, bytesRead);
                }
                connOut.flush();
                connOut.close();
            }

            int status = conn.getResponseCode();
            resp.setStatus(status);

            java.util.Map<String, java.util.List<String>> respHeaders = conn.getHeaderFields();
            for (java.util.Map.Entry<String, java.util.List<String>> entry : respHeaders.entrySet()) {
                String headerName = entry.getKey();
                if (headerName == null) continue;
                if (headerName.equalsIgnoreCase("transfer-encoding")) continue;
                for (String headerValue : entry.getValue()) {
                    resp.addHeader(headerName, headerValue);
                }
            }

            InputStream connIn = (status >= 400) ? conn.getErrorStream() : conn.getInputStream();
            if (connIn != null) {
                OutputStream respOut = resp.getOutputStream();
                byte[] buffer = new byte[8192];
                int bytesRead;
                while ((bytesRead = connIn.read(buffer)) != -1) {
                    respOut.write(buffer, 0, bytesRead);
                }
                respOut.flush();
                connIn.close();
            }
        } finally {
            conn.disconnect();
        }
    }
}
