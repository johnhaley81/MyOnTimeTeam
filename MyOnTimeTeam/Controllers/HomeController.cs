using System;
using System.Web.Mvc;

namespace MyOnTimeTeam.Controllers
{
    public class HomeController : Controller
    {
        /*public ActionResult Index()
        {
            ViewBag.message = "Please log in to your OnTime instance and allow My OnTime Team to access it.";
            return View();
        }*/

        public ActionResult Index(string err)
        {
            try
            {
                if (err.Equals("true"))
                {
                    ViewBag.message = "An error has occurred. Either you did not enable the API in your instance of OnTime, or you are out of API calls for the day.";

                }
                else
                {
                    ViewBag.message = "Please log in to your OnTime instance and allow My OnTime Team to access it.";
                }
            }
            catch (Exception)
            {
                ViewBag.message = "Please log in to your OnTime instance and allow My OnTime Team to access it.";
            }

            return View();
        }

        public ActionResult About()
        {
            return PartialView();
        }
    }
}