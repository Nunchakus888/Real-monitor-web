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

host = '172.16.73.102'
username = 'root'
password = 'sumscope'
db = 'DataService'
port = 3306
sql = 'select * from t_log where 1=1 order by LOGID DESC'


class Application(tornado.web.Application):
    def __init__(self):
        self.web_sockets = []
        handlers = [
            (r"/", HomeHandler),
            (r"/websocket", WebSocket),
            (r"/login", LoginHandler),
            (r"/logout", LogoutHandler),
            (r"/queryApi", QueryApiHandler),
            (r"/queryLog", QueryDataPagination)
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
        isql = 'select * from t_log where %s order by %s' % ('LOGID>' + str(self.query_tag) + '', 'LOGID DESC')
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



class QueryApiHandler(BaseHandler):
    def post(self):
        api_name = self.json_args['apiName']
        num = int(self.json_args['timeLine'])
        qsql = 'select * from (%s) total_table where %s and %s' % (
            sql, 'APINAME="' + api_name + '"', 'SQL_TAKETIME>' + str(num) + '')
        res = QueryDataHandler(get_connect()).get_api_data(qsql)
        data = {}
        if res:
            data['data'] = res
        self.response(data)


class QueryDataPagination(BaseHandler):
    def post(self):
        page = self.json_args['page']
        size = self.json_args['size']
        psql = 'select * from (%s) total_table limit %s,%s' % (sql, page * size, size)
        res = QueryDataHandler(get_connect()).get_api_data(psql)
        data = {}
        if res:
            data['data'] = res
        self.response(data)


class QueryDataHandler():
    def __init__(self, conn):
        self.conn = conn

    def get_api_data(self, sql, size=None):
        try:
            cur = self.conn.cursor()
            cur.execute(sql)
            if size:
                rs = cur.fetchmany(size)
            else:
                rs = cur.fetchall()
            cur.close()
            return rs
        except Exception as e:
            print '出现错误', e
        finally:
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
                        print 'heartbeat'
                        ws.send_message(self.formalize_message(exception_message))
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
    count_max_sql = 'select MAX(LOGID) from t_log'
    max_log_id = QueryDataHandler(get_connect()).get_api_data(count_max_sql)
    global max_id
    max_id = max_log_id[0][0]
    print max_id, 'max_id~~~!!!~~~'
    interval(QueryInterval(application, max_id), 10)
    http_server.listen("8888")
    tornado.ioloop.IOLoop.current().start()

if __name__ == "__main__":
    main()
