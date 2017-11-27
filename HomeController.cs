using System;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.Web.Routing;

using GIS.Exceptions;
using GIS.Data;

namespace GIS.Controllers
{
    /// <summary>
    /// Default controller.
    /// </summary>
    public class HomeController : Controller
    {
        #region [ Actions ]

        /// <summary>
        /// GET: /Home/
        /// </summary>
        [HttpGet]
        public ActionResult Town()
        {
            var context = new Context();
            var z = context.GetTown();
            return Json(z, JsonRequestBehavior.AllowGet);
        }

        /// <summary>
        /// GET: /Home/
        /// </summary>
        [HttpGet]
        public ActionResult NearestTowns(string x, string y, string name)
        {
            var context = new Context();
            var z = context.GetNearestTowns(x, y, name);
            return Json(z, JsonRequestBehavior.AllowGet);
        }

        /// <summary>
        /// GET: /Home/
        /// </summary>
        [HttpGet]
        public ActionResult Regions()
        {
            var context = new Context();
            var z = context.GetRegions();
            return Json(z, JsonRequestBehavior.AllowGet);
        }

        /// <summary>
        /// GET: /Home/
        /// </summary>
        [HttpPost]
        public ActionResult Rivers(string region, string geom)
        {
            var context = new Context();
            var z = context.GetRivers(region, geom);
            return Json(z, JsonRequestBehavior.AllowGet);
        }

        /// <summary>
        /// GET: /Home/
        /// </summary>
        [HttpPost]
        public ActionResult RiversCount(string region, string geom)
        {
            var context = new Context();
            var z = context.GetRiversCount(region, geom);
            return Json(z, JsonRequestBehavior.AllowGet);
        }

        /// <summary>
        /// GET: /Home/
        /// </summary>
        [HttpGet]
        public ActionResult Districts()
        {
            var context = new Context();
            var z = context.GetDistricts();
            return Json(z, JsonRequestBehavior.AllowGet);
        }

        /// <summary>
        /// GET: /Home/
        /// </summary>
        [HttpPost]
        public ActionResult FarestPoint(string poi, string gid)
        {
            var context = new Context();
            var z = context.GetFarestPoint(poi, gid);
            return Json(z, JsonRequestBehavior.AllowGet);
        }


        /// <summary>
        /// GET: /Home/
        /// </summary>
        [OutputCacheAttribute(VaryByParam = "*", Duration = 0, NoStore = true)]
        public ActionResult Index(string id)
        {
            // Id represents map variant name
            string variant = (id ?? Config.Variants.First()).ToLower();

            // Check for the valid map variant
            if (!Config.Variants.Contains(variant))
            {
                throw new NotAllowedException();
            }

            return View("Index", variant as object);
        }


        /// <summary>
        /// Culture change action.
        /// </summary>
        /// <param name="culture">Name of the culture to change.</param>
        /// <param name="returnUrl">Return url.</param>
        public ActionResult ChangeCulture(string culture, string returnUrl)
        {
            var cul = Config.GetImplementedCulture(culture);

            // Nastavime culture
            this.RouteData.Values["culture"] = cul;

            // Ak neprisla navratova url adresa vratime sa na uvodnu strankuu
            if (string.IsNullOrEmpty(returnUrl))
            {
                return RedirectToAction("Index", "Home");
            }

            // Zaciatok query stringu
            int qIndex = returnUrl.IndexOf('?');

            // Vytvorit route data pre navratovu url
            var routeData = RouteTable.Routes.GetRouteData(
                new HttpContextWrapper(
                    new HttpContext(
                        new HttpRequest(
                            null,
                            new UriBuilder(
                                Request.Url.Scheme,
                                Request.Url.Host,
                                Request.Url.Port,
                                (qIndex != -1) ? returnUrl.Substring(0, qIndex) : returnUrl).ToString(),
                            (qIndex != -1) ? returnUrl.Substring(qIndex + 1) : string.Empty),
                        new HttpResponse(new StringWriter())
                    )
                )
            );
            routeData.Values["culture"] = cul;
            return RedirectToRoute(routeData.Values);
        }

        #endregion
    }
}