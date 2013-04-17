using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace MyOnTimeTeam.Infrastructure
{
	public class Utils
	{
		/// <summary>
		/// Get the host name and port number
		/// </summary>
		/// <param name="protocol"></param>
		/// <returns></returns>
		private static string GetHost(string protocol)
		{
			string serverName = HttpContext.Current.Request.ServerVariables["SERVER_NAME"];
			string serverPort = HttpContext.Current.Request.ServerVariables["SERVER_PORT"];

			// Most proxies add an X-Forwarded-Host header which contains the original Host header
			// including any non-default port.
			string forwardedHosts = HttpContext.Current.Request.Headers["X-Forwarded-Host"];

			if (forwardedHosts != null)
			{
				// If the request passed through multiple proxies, they will be separated by commas.
				// We only care about the first one.
				string forwardedHost = forwardedHosts.Split(',')[0];
				string[] serverAndPort = forwardedHost.Split(':');

				serverName = serverAndPort[0];
				serverPort = null;

				if (serverAndPort.Length > 1)
					serverPort = serverAndPort[1];
			}

			// Only include a port if it is not the default for the protocol and MapAlternatePort = true
			// in the config file.
			// TODO: usare MapAlternatePort
			if ((protocol == "http" && serverPort == "80") || (protocol == "https" && serverPort == "443"))
				serverPort = null;

			string host = serverName;

			if (serverPort != null)
			{
				host += ":" + serverPort;
			}
			return host;
		}

		public static string GetApplicationRoot()
		{
			string path = HttpContext.Current.Request.ApplicationPath;

			if (path.Length == 1)
				return "";
			else
				return path;
		}
		
		public static string GetSiteRoot()
		{
			string protocol = "http";

			if (HttpContext.Current.Request.ServerVariables["HTTPS"] == "on")
				protocol += "s";

			string host = GetHost(protocol);

			return protocol + "://" + host + GetApplicationRoot();
		}

		public static string GetHostName()
		{
			string protocol = "http";

			if (HttpContext.Current.Request.ServerVariables["HTTPS"] == "on")
				protocol += "s";

			return GetHost(protocol);
		}

		public static string GetSecureSiteRoot()
		{
			string protocol = "https";
			string host = GetHost(protocol);

			return protocol + "://" + host + GetApplicationRoot();
		}

		public static string GetVirtualRoot()
		{
			string serverName = HttpContext.Current.Request.ServerVariables["SERVER_NAME"];

			return string.Concat("/", serverName, GetApplicationRoot());
		}
	}
}