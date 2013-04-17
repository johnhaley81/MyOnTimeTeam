using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace MyOnTimeTeam.Infrastructure
{
	public class Utils
	{
		public static string GetSiteRoot()
		{
			return HttpContext.Current.Request.Url.Scheme 
				+ "://"
				+ HttpContext.Current.Request.Url.Authority 
				+ HttpContext.Current.Request.ApplicationPath;
		}
	}
}