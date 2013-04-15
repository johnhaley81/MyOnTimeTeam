using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Web;
using System.Web.Mvc;
using MyOnTimeTeam.Infrastructure;

namespace MyOnTimeTeam.Controllers
{
	public class OnTimeController : Controller
	{
		public ActionResult Proxy(string resource)
		{
			// create the HTTP request
			var url = GetUrl(resource); //using the URL of the specified resource
			// forward any query parameters (other than resource)
			foreach (string queryElement in Request.QueryString)
				if (queryElement != "resource")
					url += "&" + HttpUtility.UrlEncode(queryElement) + "=" + HttpUtility.UrlEncode(Request.QueryString[queryElement]);
			var request = WebRequest.Create(url);
			request.Method = Request.HttpMethod; // use the same method that was used to make the proxy call
			if (string.Compare(Request.HttpMethod, "POST", ignoreCase: true) == 0)
			{
				request.ContentType = Request.ContentType; // and the same content type
				Request.InputStream.Seek(0, SeekOrigin.Begin);
				Request.InputStream.CopyTo(request.GetRequestStream()); // and the same payload
			}

			// make the request and grab the response
			Stream resultStream;
			HttpWebResponse response;
			try
			{
				response = (HttpWebResponse)request.GetResponse();
			}
			catch (WebException e)
			{
				response = (HttpWebResponse)e.Response;
			}

			// proxy the results back to our caller
			resultStream = response.GetResponseStream();

			Response.ContentType = response.ContentType;
			try
			{
				Response.ContentEncoding = Encoding.GetEncoding(response.ContentEncoding);
			}
			catch (Exception) { }
			Response.Charset = response.CharacterSet;
			Response.StatusCode = (int)response.StatusCode;
			Response.StatusDescription = response.StatusDescription;

			resultStream.CopyTo(Response.OutputStream);

			return null;
		}

		private string GetUrl(string resource, IEnumerable<KeyValuePair<string, object>> parameters = null)
		{
			string onTimeUrl = Request.Cookies[Constants.ONTIME_URL].Value;
			string accessToken = Request.Cookies[Constants.ONTIME_OAUTH_TOKEN].Value;
			var apiCallUrl = new UriBuilder(onTimeUrl);
			apiCallUrl.Path += "/api/v1/" + resource;

			var finalParameters = new Dictionary<string, string>();

			if (parameters != null)
				foreach (var parameter in parameters)
					finalParameters.Add(parameter.Key, parameter.Value.ToString());

			if (accessToken != null)
				finalParameters.Add("access_token", accessToken);

			apiCallUrl.Query = string.Join(
				"&",
				(from parameter in finalParameters select (parameter.Key + "=" + HttpUtility.UrlEncode(parameter.Value))).ToArray()
			);

			return apiCallUrl.ToString();
		}
	}
}
