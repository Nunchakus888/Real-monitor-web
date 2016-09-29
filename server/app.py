# -*- coding: utf-8 -*-

import os
import os.path
import tornado.ioloop
import tornado.web
import tornado.websocket
import tornado.httpserver
from tornado.escape import json_decode, json_encode
import MySQLdb
from qpid.messaging import *
from apscheduler.schedulers.tornado import TornadoScheduler
import threading
import datetime

host = '172.16.73.102'
username = 'root'
password = 'sumscope'
db = 'DataService'
port = 3306
sql = 'SELECT * FROM t_log WHERE 1=1 ORDER BY LOGID DESC'


class Application(tornado.web.Application):
    def __init__(self):
        self.web_sockets = []
        handlers = [
            (r"/", HomeHandler),
            (r"/websocket", WebSocket),
            (r"/login", LoginHandler),
            (r"/logout", LogoutHandler),
            (r"/queryApi", QueryOneApiOperation),
            (r"/updateApi", UpdateApi),
            (r"/queryLog", QueryDataPagination),
            (r"/apidataApi", QueryDataApi)
        ]
        settings = dict(
            template_path=os.path.join(os.path.dirname(__file__), "../www"),
            static_path=os.path.join(os.path.dirname(__file__), "../www"),
            debug=True,
        )
        super(Application, self).__init__(handlers, **settings)


class BaseHandler(tornado.web.RequestHandler):
    def prepare(self):
        if "Content-Type" not in self.request.headers:
            return
        content_type = self.request.headers["Content-Type"].strip()
        if not content_type:
            return

        if content_type.startswith("application/json"):
            self.json_args = json_decode(self.request.body)
        else:
            self.json_args = None

    def response_error(self, err):
        self.write(json_encode({"error": err}))

    def response(self, res_dict):
        self.write(json_encode(res_dict))


class HomeHandler(BaseHandler):
    def get(self):
        self.render("index.html")


class LoginHandler(BaseHandler):
    def post(self):
        uname = self.json_args["username"]
        pwd = self.json_args["password"]
        if uname and pwd:
            rs = QueryDataHandler(get_connect()).get_api_data(sql, 30)
            data = {}
            data['data'] = rs
            self.response(data)
            max_id = list(rs[0])[0]


class QueryInterval():
    def __init__(self, application, query_tag):
        self.query_tag = query_tag
        self.websocket_list = application.web_sockets

    def __call__(self):
        isql = 'SELECT * FROM t_log WHERE %s ORDER BY %s' % ('LOGID>' + str(self.query_tag) + '', 'LOGID DESC')
        rs = QueryDataHandler(get_connect()).get_api_data(isql)
        if rs and self.websocket_list:
            self.query_tag = list(rs[0])[0]
            for ws in self.websocket_list:
                print ws, 'websocket_list'
                ws.send_message(json_encode(rs))


class LogoutHandler(BaseHandler):
    def post(self):
        username = self.json_args["username"]
        password = self.json_args["password"]
        print username, '~~:', password


class WebSocket(tornado.websocket.WebSocketHandler):
    def open(self):
        self.application.web_sockets.append(self)
        print("WebSocket opened")

    def send_message(self, message):
        self.write_message(message)

    def on_message(self, msg):
        pass

    def on_close(self):
        for i in range(len(self.application.web_sockets)):
            if self == self.application.web_sockets[i]:
                del (self.application.web_sockets[i])
        print("WebSocket closed")


class QueryOneApiOperation(BaseHandler):
    def post(self):
        api_name = self.json_args['apiName']
        num = int(self.json_args['timeLine'])
        print '~~~~~', api_name, '~~~', num
        avg_sql = 'SELECT AVG(SQL_TAKETIME) FROM t_log WHERE %s' % ('APINAME="' + api_name + '"')
        qsql = 'select * from t_log where %s and %s order by LOGID DESC' % ('APINAME="' + api_name + '"', 'SQL_TAKETIME>' + str(num) + '')
        # qsql = 'SELECT * FROM t_log WHERE %s ORDER BY LOGID DESC' % ('SQL_TAKETIME>(' + avg_sql + ')')
        print 'sql~~~', qsql
        res = QueryDataHandler(get_connect()).get_api_data(qsql)
        print len(res)
        data = {}
        if res:
            data['data'] = res
            self.response(data)


class UpdateApi(BaseHandler):
    def post(self):
        new_api_data = self.json_args['newApiData']
        operation_type = self.json_args['type']
        column_list = ["DATA_SOURCE_ID", "DATA_SOURCE_DB_ID", "API_NAME", "INPUT_ARGS", "OUTPUT_ARGS", "LOGIC_SQL",
                       "API_GROUPS", "VERSION", "COMMENTS", "AVAILABLE_FLAG", "CREATOR", "CREATE_TIME",
                       "LAST_MODIFY_PERSON", "LAST_MODIFY_TIME", "EXTRA1", "EXTRA2", "EXTRA3", "IS_WHERE_AVAILABLE",
                       "FORCE_CONDITION", "DATE_COLUMN"]
        column_value = column_name = set_update_str = ''
        index = 0
        for i in new_api_data:
            index = index + 1
            if i:
                set_update_str = ((set_update_str + "," if set_update_str else set_update_str) + column_list[
                    index - 1] + "=" + "'%s'" % i)
                column_name = (column_name + ',' if column_name else column_name) + column_list[index - 1]
                column_value = (column_value + ',' if column_value else column_value) + "'%s'" % i

        if operation_type == 'add':
            add_sql = "INSERT INTO t_api (%s) VALUES (%s)" % (column_name, column_value)
            print 'add_sql~~add_sql', add_sql
            res = UpdateDataHandler(get_connect()).update_api_data(add_sql)
            if type(res) == long:
                print 'insert successful~~~', res
            else:
                print 'insert failed~~~~', res[1]
                self.response({'error': res[1]})
        else:
            update_sql = "UPDATE t_api SET %s WHERE API_NAME='%s'" % (set_update_str, operation_type)
            print 'update_sql~~~~~', update_sql
            res = UpdateDataHandler(get_connect()).update_api_data(update_sql)
            if type(res) == long:
                print 'update successful~~~', res
            else:
                print 'update failed~~~~', res[1]
                self.response({'error': res[1]})


class QueryDataPagination(BaseHandler):
    def post(self):
        page = self.json_args['page']
        size = self.json_args['size']
        dataType = self.json_args['dataType']
        if dataType == 'log':
            query_sql = 'SELECT * FROM t_log WHERE 1=1 ORDER BY LOGID DESC'
        else:
            query_sql = 'SELECT * FROM t_api WHERE 1=1 ORDER BY CREATE_TIME DESC'

        psql = 'SELECT * FROM (%s) total_table limit %s,%s' % (query_sql, page * size, size)
        res = QueryDataHandler(get_connect()).get_api_data(psql)
        data = {}
        if res:
            data['data'] = res
            self.response(data)


class QueryDataApi(BaseHandler):
    def post(self):
        apisql = 'SELECT * FROM t_api WHERE 1=1 ORDER BY CREATE_TIME DESC'
        ret = QueryDataHandler(get_connect()).get_api_data(apisql, 30)
        # res = list(ret)
        # data = []
        # for i in range(len(res)):
        #     data.append(list(res[i]))
        #     for j in range(len(list(res[i]))):
        #         if type(list(res[i])[j]) == datetime.datetime:
        #             data[i][j] = str(list(res[i])[j])
        self.response({'data': ret})


class QueryDataHandler:
    def __init__(self, conn):
        self.conn = conn

    def get_api_data(self, sql, size=None):
        try:
            cur = self.conn.cursor()
            cur.execute(sql)
            if size is None:
                rs = cur.fetchall()
            else:
                rs = cur.fetchmany(size)
            cur.close()
            return rs
        except Exception as e:
            print '出现错误', e
        finally:
            self.conn.close()


class UpdateDataHandler:
    def __init__(self, conn):
        self.conn = conn

    def update_api_data(self, sql):
        cur = self.conn.cursor()
        try:
            cur.execute(sql)
            self.conn.commit()
            return cur.rowcount
        except Exception as e:
            self.conn.rollback()
            print 'update出现错误', e
            return e
        finally:
            print 'close conn~~~~~'
            self.conn.close()


class QpidListenerThread(threading.Thread):
    def __init__(self, web_socket_list, session, address):
        threading.Thread.__init__(self)
        self.web_socket_list = web_socket_list
        self.session = session
        self.address = address

    def run(self):
        try:
            receiver_exception = self.session.receiver(self.address)
            while True:
                for ws in self.web_socket_list:
                    exception_message = receiver_exception.fetch()
                    try:
                        if exception_message:
                            pass
                        else:
                            ws.send_message('false')

                    except Exception as e:
                        print e
                    self.session.acknowledge(exception_message)
        except MessagingError, m:
            print m


def formalize_message(self, qpid_message):
    pass


class ExceptionListenerThread(QpidListenerThread):
    def __init__(self, web_socket_list, session, address):
        QpidListenerThread.__init__(self, web_socket_list, session, address)

    def formalize_message(self, qpid_message):
        return {'type': 'exception', 'content': json_decode(qpid_message.content)}


class HeartBeatListenerThread(QpidListenerThread):
    def __init__(self, web_socket_list, session, address):
        QpidListenerThread.__init__(self, web_socket_list, session, address)

    def formalize_message(self, qpid_message):
        return {'type': 'heartbeat', 'content': json_decode(qpid_message.content)}


def get_connect():
    return MySQLdb.connect(host=host, user=username, passwd=password, db=db, port=port, charset="utf8")


def interval(func, time):
    scheduler = TornadoScheduler()
    scheduler.add_job(func, 'interval', seconds=time)
    scheduler.start()
    print('Press Ctrl+{0} to exit'.format('Break' if os.name == 'nt' else 'C'))


def main():
    broker = "172.16.73.102:5700"
    connection = Connection(broker)
    connection.open()
    session = connection.session()
    heartbeat_address = "autosys.job.heartbeat;{create:always,delete:never,node:{type:topic,durable:True}}"
    exception_address = "autosys.job.exception;{create:always,delete:never,node:{type:queue,durable:True}}"
    application = Application()
    http_server = tornado.httpserver.HTTPServer(application)
    ExceptionListenerThread(application.web_sockets, session, exception_address).start()
    HeartBeatListenerThread(application.web_sockets, session, heartbeat_address).start()

    # 查询最新数据的id, 轮询数据库
    count_max_sql = 'SELECT MAX(LOGID) FROM t_log'
    max_log_id = QueryDataHandler(get_connect()).get_api_data(count_max_sql)
    global max_id
    max_id = max_log_id[0][0]
    print max_id, 'max_id~~~!!!~~~'
    interval(QueryInterval(application, max_id), 10)

    # engine = create_engine('mysql://root:sumscope@172.16.73.102:3306/DataServiceNew', encoding='utf-8', echo=True)
    # Session = sessionmaker(bind=engine)
    # session = Session()
    # metadata = MetaData(engine)
    # api_table = Table('t_api', metadata, autoload=True)
    # select = api_table.select()
    # print '~~~~~~~~~~~~~~~~', select.execute().fetchall()
    http_server.listen("8888")
    tornado.ioloop.IOLoop.current().start()


if __name__ == "__main__":
    main()
