# Import libraries
import http.server
import socketserver
  
# Defining PORT number
PORT = 8080
  
# Creating handle
Handler = http.server.SimpleHTTPRequestHandler
  
# Creating TCPServer
http = socketserver.TCPServer(("", PORT), Handler)
  
# Getting logs
print("serving at port", PORT)
http.serve_forever()