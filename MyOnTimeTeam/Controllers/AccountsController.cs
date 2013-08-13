using AttributeRouting;
using AttributeRouting.Web.Mvc;
using MyOnTimeTeam.Infrastructure;
using MyOnTimeTeam.Models;
using Newtonsoft.Json;
using System;
using System.Configuration;
using System.IO;
using System.Net;
using System.Web;
using System.Web.Mvc;

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
        public ActionResult OnTimeAuth(LogOnModel model)
        {
            if (ModelState.IsValid)
            {
                if (!model.OnTimeUrl.Contains("https://") && !model.OnTimeUrl.Contains("http://"))
                    model.OnTimeUrl = "https://" + model.OnTimeUrl;

                var url = "{url}/auth?response_type=code&client_id={ontime_client_id}&redirect_uri={redirect_url}&state={state}";
                url = url.Replace("{url}", model.OnTimeUrl)
                    .Replace("{ontime_client_id}", ConfigurationManager.AppSettings["OnTimeClientId"])
                    .Replace("{redirect_url}", HttpUtility.UrlEncode(getRedirectUri()))
                    .Replace("{state}", HttpUtility.UrlEncode(model.OnTimeUrl));

                JsonResult resp = new JsonResult();
                resp.Data = url;

                return resp;
            }

            // If we got this far, something failed, redisplay form
            return View(model);
        }

        public ActionResult OnTimeAuth(string url)
        {
            ViewBag.Url = url;
            return PartialView();
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
                    dynamic data = json["data"];
                    string firstName = data["first_name"];
                    string lastName = data["last_name"];
                    string email = data["email"];

                    HttpContext.Response.AppendCookie(new HttpCookie(Constants.ONTIME_OAUTH_TOKEN, accessToken));
                    HttpContext.Response.AppendCookie(new HttpCookie(Constants.ONTIME_URL, state));

                    //login was successful, let's add a record of it to the database
                    DatabaseHelper.LogLogin(firstName + " " + lastName, email, state, DateTime.Now.ToString());


                    return Redirect("/accounts/tokenRedirect");
                }
            }
            catch (WebException)
            {
                return Redirect("LoginFailed");
            }
        }

        public ActionResult LoginFailed()
        {
            return View();
        }

        public ActionResult tokenRedirect()
        {
            return View();
        }

        public string getRedirectUri()
        {
       
            return Utils.GetSiteRoot() + "accounts/receive_code";
            //
        }
    }
}