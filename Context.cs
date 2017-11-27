using Npgsql;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Web.Script.Serialization;

namespace GIS.Data
{
    public class Context
    {
        private NpgsqlConnection _connection;

        private string cmnd = @"select * from osm_pois limit 10";

        private string towns = @"
            select name, ST_AsGeoJSON(geom) from places where fclass = 'town'
            offset {0} limit 1";

        private string nearestTowns = @"
            select 
	            ST_Distance_Sphere(ST_MakePoint({0}, {1}), a.geom) as distance,
	            name,
	            ST_AsGeoJSON(geom),
	            (select 
                    ST_Distance_Sphere(ST_MakePoint({0}, {1}),pl.geom) 
                from places pl 
                where pl.name='{2}'
                limit 1) as distfrom
            from
                places a
            where 
                fclass = 'town'
            order by distance
            limit 3";


        private string regions = @"
            select name_1, ST_AsGeoJSON(geom) from region
            order by name_1";
        
       private string districts = @"
            select name_2, ST_AsGeoJSON(geom), gid from district
            order by name_2";

        private string rivers = @"
        select 
            ST_AsGeoJSON(w.geom) from waterways w
        where
            name is not null
        and
            ST_Intersects(
                w.geom,
	            ST_GeomFromGeoJSON('{1}')
            )";


        private string riversCount = @"
        select 
            count(distinct(w.name)) from waterways w
        where
            name is not null
        and
            ST_Intersects(
                w.geom,
	            ST_GeomFromGeoJSON('{1}')
            )";

        private string farestpoint = @" with
            points as
	            (select st_union(geom) geom from pois where fclass = '{0}'
	            and
                ST_Within(
                    geom,
		            (select geom from district p where gid = {1})
	            )), --body ku ktorym sa ma kontrolovat vzdialenost
            polygon as
	            (select geom from district p where gid = {1})--polygon v ktorom sa hlada najvzdialenejsi bod
            select
            (select ST_AsGeoJSON(pts.geom) from points pts) pois, --body od ktorych sa hladal najvzdialenejsi
            ST_AsGeoJSON(x.geom) farestpoint, --bod co je najdalej
            ST_AsGeoJSON(st_shortestline(x.geom, y.geom)) connectline --najkratsia spojnica bodu co je najdalej a vstupnych bodob
             from
               (
                 select 
                    st_setsrid(ST_CreateFishnet0(100,100,(ST_XMax(p.geom)-ST_XMin(p.geom))/100,
                (ST_yMax(p.geom)-ST_yMin(p.geom))/100,ST_XMin(p.geom),st_ymin(p.geom)),st_srid(p.geom)) geom,p.geom xgeom from polygon p) x,points y
                where st_within(x.geom, x.xgeom)
            order by st_distance(x.geom, y.geom) desc limit 1";

        #region [ Constructors ]

        /// <summary>
        /// Konštruktor, ktorý incializuje spojenie s databázou ku ktorej je connection string
        /// uložený v appSetting-u s kľúčom 'EsknBoContextConnectionStringName'.
        /// </summary>
        public Context()
            : this(ConfigurationManager.AppSettings["DataContextConnectionStringName"])
        {
        }


        /// <summary>
        /// Konštruktor ktorý inicializuje spojenie s databázou ku ktorej je spojenie definované
        /// vstupným <paramref name="connectionStringName"/> parametrom.
        /// </summary>
        /// <param name="connectionStringName">Názov connection string-u.</param>
        public Context(string connectionStringName)
        {
            this._connection = Context.CreateConnection(connectionStringName);
        }

        #endregion


        #region [ Methods : Private ]

        /// <summary>
        /// Vytvorí pripojenie na databázu na základe vstupného <paramref name="connectionStringName"/> parametra.
        /// </summary>
        /// <param name="connectionStringName">Názov pripojenia na databázu.</param>
        /// <returns>Pripojenie na databázu.</returns>
        private static NpgsqlConnection CreateConnection(string connectionStringName)
        {
            if (string.IsNullOrWhiteSpace(connectionStringName))
            {
                throw new ArgumentNullException("connectionStringName", "Missing name of the connection string.");
            }

            var connectionString = ConfigurationManager.ConnectionStrings[connectionStringName];
            if (connectionString == null)
            {
                throw new ArgumentException("Unable to find connection string with name '" + connectionStringName + "'.", "connectionStringName");
            }

            NpgsqlConnection con = new NpgsqlConnection(connectionString.ToString());

            return con;
        }

        #endregion


        #region [Public Methods]
        
        /*
         * Returns random town in Slovakia.
         */
        public string GetTown()
        {
            this._connection.Open();
            Random rnd = new Random();
            int x = rnd.Next(0, 146);
            var command = new NpgsqlCommand(string.Format(this.towns, x), this._connection);

            NpgsqlDataAdapter da = new NpgsqlDataAdapter(command);
            DataSet ds = new DataSet();
            ds.Reset();
            da.Fill(ds);
            string result = null;

            foreach (DataRow row in ds.Tables[0].Rows)
            {
                var obj = new
                {
                    name = row.ItemArray[0].ToString(),
                    geom = row.ItemArray[1].ToString()
                };
                result = new JavaScriptSerializer().Serialize(obj);
            }


            this._connection.Close();

            return result;
        }

        /*
         * Returns 3 nearest towns to coordinates and distance beetween coordinates and town name.
         */
        public string GetNearestTowns(string x, string y, string name)
        {
            this._connection.Open();
            var command = new NpgsqlCommand(string.Format(this.nearestTowns, x, y, name), this._connection);
            NpgsqlDataAdapter da = new NpgsqlDataAdapter(command);
            DataSet ds = new DataSet();
            ds.Reset();
            da.Fill(ds);

            List<string> result = new List<string>();
            var jsonSerialiser = new JavaScriptSerializer();

            foreach (DataRow row in ds.Tables[0].Rows)
            {
                var obj = new
                {
                    distance = row.ItemArray[0].ToString(),
                    name = row.ItemArray[1].ToString(),
                    geom = row.ItemArray[2].ToString(),
                    distfrom = row.ItemArray[3].ToString()
                };
                result.Add(jsonSerialiser.Serialize(obj));
            }


            this._connection.Close();

            return jsonSerialiser.Serialize(result);
        }

        /*
         * Returns regions.
         */
        public string GetRegions()
        {
            this._connection.Open();
            var command = new NpgsqlCommand(this.regions, this._connection);

            NpgsqlDataAdapter da = new NpgsqlDataAdapter(command);
            DataSet ds = new DataSet();
            ds.Reset();
            da.Fill(ds);

            List<string> result = new List<string>();
            var jsonSerialiser = new JavaScriptSerializer();

            foreach (DataRow row in ds.Tables[0].Rows)
            {
                var obj = new
                {
                    name = row.ItemArray[0].ToString(),
                    geom = row.ItemArray[1].ToString()
                };
                result.Add(jsonSerialiser.Serialize(obj));
            }


            this._connection.Close();

            return jsonSerialiser.Serialize(result);
        }

        public string GetRivers(string region, string geom)
        {
            this._connection.Open();
            var command = new NpgsqlCommand(string.Format(this.rivers, region, geom), this._connection);

            NpgsqlDataAdapter da = new NpgsqlDataAdapter(command);
            DataSet ds = new DataSet();
            ds.Reset();
            da.Fill(ds);

            List<string> result = new List<string>();
            var jsonSerialiser = new JavaScriptSerializer();

            foreach (DataRow row in ds.Tables[0].Rows)
            {
                var obj = new
                {
                    geom = row.ItemArray[0].ToString(),
                };
                result.Add(jsonSerialiser.Serialize(obj));
            }


            this._connection.Close();

            return jsonSerialiser.Serialize(result);
        }

        public string GetRiversCount(string region, string geom)
        {
            this._connection.Open();
            var command = new NpgsqlCommand(string.Format(this.riversCount, region, geom), this._connection);

            NpgsqlDataAdapter da = new NpgsqlDataAdapter(command);
            DataSet ds = new DataSet();
            ds.Reset();
            da.Fill(ds);

            string result = null;
            var jsonSerialiser = new JavaScriptSerializer();

            foreach (DataRow row in ds.Tables[0].Rows)
            {
                result = row.ItemArray[0].ToString();
            }


            this._connection.Close();

            return result;
        }

        public string GetDistricts()
        {
            this._connection.Open();
            var command = new NpgsqlCommand(this.districts, this._connection);

            NpgsqlDataAdapter da = new NpgsqlDataAdapter(command);
            DataSet ds = new DataSet();
            ds.Reset();
            da.Fill(ds);

            List<string> result = new List<string>();
            var jsonSerialiser = new JavaScriptSerializer();

            foreach (DataRow row in ds.Tables[0].Rows)
            {
                var obj = new
                {
                    name = row.ItemArray[0].ToString(),
                    geom = row.ItemArray[1].ToString(),
                    gid = row.ItemArray[2].ToString()
                };
                result.Add(jsonSerialiser.Serialize(obj));
            }


            this._connection.Close();

            return jsonSerialiser.Serialize(result);
        }

        public string GetFarestPoint(string poi, string gid)
        {
            this._connection.Open();
            var command = new NpgsqlCommand(string.Format(this.farestpoint, poi, gid), this._connection);

            NpgsqlDataAdapter da = new NpgsqlDataAdapter(command);
            DataSet ds = new DataSet();
            ds.Reset();
            da.Fill(ds);

            List<string> result = new List<string>();
            var jsonSerialiser = new JavaScriptSerializer();

            foreach (DataRow row in ds.Tables[0].Rows)
            {
                var obj = new
                {
                    points = row.ItemArray[0].ToString(),
                    farestpoint = row.ItemArray[1].ToString(),
                    connectline = row.ItemArray[2].ToString()
                };
                result.Add(jsonSerialiser.Serialize(obj));
            }


            this._connection.Close();

            return jsonSerialiser.Serialize(result);
        }

        #endregion
    }
}