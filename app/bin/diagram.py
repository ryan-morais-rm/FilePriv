from diagrams import Diagram
from diagrams.aws.compute import EC2

with Diagram("FilePriv", show=False, direction="TB"):
    EC2("localhost") >> [EC2("node-FilePriv1"),
                  EC2("node-FilePriv2"),
                  EC2("node-FilePriv3")]
