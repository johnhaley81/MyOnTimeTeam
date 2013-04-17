using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace MyOnTimeTeam.Models
{
	public class LogOnModel
	{
		[Required]
		[DataType(DataType.Url)]
		[Display(Name = "OnTime Url")]
		public string OnTimeUrl { get; set; }
	}
}