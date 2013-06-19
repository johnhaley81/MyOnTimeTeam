using System;
using System.Collections.Generic;
using System.Configuration;
using System.IO;
using System.Linq;
using System.Net;
using System.Web;
using System.Web.Mvc;
using System.Web.Profile;
using AttributeRouting;
using AttributeRouting.Web.Mvc;
using MyOnTimeTeam.Infrastructure;
using MyOnTimeTeam.Models;
using Newtonsoft.Json;

namespace MyOnTimeTeam.Controllers
{
	[RoutePrefix]
	public class AccountsController : Controller
	{
		[GET("login")]
		public ActionResult LogOn()
		{
			return PartialView();
		}

		[POST("login")]
		public ActionResult LogOn(LogOnModel model, string returnUrl)
		{
			if (ModelState.IsValid)
			{
				var url = "{url}/auth?response_type=code&client_id={ontime_client_id}&redirect_uri={redirect_url}&state={state}";
				url = url.Replace("{url}", model.OnTimeUrl)
					.Replace("{ontime_client_id}", ConfigurationManager.AppSettings["OnTimeClientId"])
					.Replace("{redirect_url}", HttpUtility.UrlEncode(getRedirectUri()))
					.Replace("{state}", HttpUtility.UrlEncode(model.OnTimeUrl));

				return Redirect(url);
			}

			// If we got this far, something failed, redisplay form
			return View(model);
		}

		[GET("receive_code")]
		public ActionResult ReceiveCode(string code, string state, string error, string error_description)
		{
			// state should be the OnTime URL to make the request to
			string requestUrl = state + "/api/oauth2/token?code=" + code + "&grant_type=authorization_code&redirect_uri=" + HttpUtility.UrlEncode(getRedirectUri()) + "&client_id=" + ConfigurationManager.AppSettings["OnTimeClientId"] + "&client_secret=" + ConfigurationManager.AppSettings["OnTimeClientSecret"];

			try
			{
				var req = (HttpWebRequest)WebRequest.Create(requestUrl);

				using (var resp = req.GetResponse())
				{
					if ((resp as HttpWebResponse).StatusCode != HttpStatusCode.OK)
					{
						throw new Exception();
					}

					string rawJson;
					using (var sr = new StreamReader(resp.GetResponseStream()))
					{
						rawJson = sr.ReadToEnd();
					}
					dynamic json = JsonConvert.DeserializeObject<dynamic>(rawJson);

					string accessToken = json["access_token"];
					//dynamic data = json["data"];
					//string firstName = data["firstName"];
					//string lastName = data["lastName"];
					//string email = data["email"];
					//int id = data["id"];

					HttpContext.Response.AppendCookie(new HttpCookie(Constants.ONTIME_OAUTH_TOKEN, accessToken));
					HttpContext.Response.AppendCookie(new HttpCookie(Constants.ONTIME_URL, state));
					return Redirect(Utils.GetSiteRoot());
				}
			}
			catch (Exception)
			{

			}
			return null;
		}

		private string getRedirectUri()
		{
			return Utils.GetSiteRoot() + "/accounts/receive_code";
            //
		}
	}
}
